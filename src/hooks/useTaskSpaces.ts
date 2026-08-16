import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/useAuth';
import type { SharedTask, TaskSpace, TaskSpaceMember } from '../types/database';

type CollaboratorRole = 'editor' | 'viewer';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteFunctionResponse {
  ok: boolean;
  sent: number;
  total: number;
  reason?: string;
}

async function sendSpaceInvites(spaceId: string, inviteeEmails: string[]): Promise<Error | null> {
  if (inviteeEmails.length === 0) return null;

  const { data, error } = await supabase.functions.invoke<InviteFunctionResponse>('send-space-invite', {
    body: { spaceId, inviteeEmails },
  });

  if (error) {
    return new Error('The invitation was saved, but its email could not be sent. Try again in a moment.');
  }

  if (!data?.ok || data.sent !== inviteeEmails.length) {
    return new Error(data?.reason || 'Some invitation emails could not be sent.');
  }

  return null;
}

export function useTaskSpaces() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<TaskSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpaces = useCallback(async () => {
    if (!user) {
      setSpaces([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [ownedSpacesResult, membershipsResult] = await Promise.all([
      supabase
        .from('task_spaces')
        .select('*')
        .eq('owner_id', user.id),
      supabase
        .from('task_space_members')
        .select('space_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted'),
    ]);

    if (ownedSpacesResult.error || membershipsResult.error) {
      setError(ownedSpacesResult.error?.message || membershipsResult.error?.message || 'Failed to load spaces.');
      setLoading(false);
      return;
    }

    const ownedSpaces = (ownedSpacesResult.data || []) as TaskSpace[];
    const ownedIds = new Set(ownedSpaces.map((space) => space.id));
    const memberSpaceIds = Array.from(new Set(
      (membershipsResult.data || [])
        .map((membership) => membership.space_id as string)
        .filter((spaceId) => !ownedIds.has(spaceId)),
    ));

    let memberSpaces: TaskSpace[] = [];
    if (memberSpaceIds.length > 0) {
      const memberSpacesResult = await supabase
        .from('task_spaces')
        .select('*')
        .in('id', memberSpaceIds);

      if (memberSpacesResult.error) {
        setError(memberSpacesResult.error.message);
        setLoading(false);
        return;
      }
      memberSpaces = (memberSpacesResult.data || []) as TaskSpace[];
    }

    setSpaces([...ownedSpaces, ...memberSpaces].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    ));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSpaces();
  }, [fetchSpaces]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`task-spaces:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_spaces' }, () => {
        void fetchSpaces();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_space_members' }, () => {
        void fetchSpaces();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchSpaces, user]);

  async function createSpace(
    name: string,
    description?: string,
    inviteEmails: { email: string; role: CollaboratorRole }[] = [],
  ) {
    if (!user) return { error: new Error('Not authenticated'), data: null };
    const normalizedName = name.trim();
    const normalizedDescription = description?.trim() || '';
    if (!normalizedName || normalizedName.length > 100) {
      return { error: new Error('Space name must be between 1 and 100 characters.'), data: null };
    }
    if (normalizedDescription.length > 2_000) {
      return { error: new Error('Description must be 2,000 characters or fewer.'), data: null };
    }
    if (inviteEmails.length > 10) {
      return { error: new Error('Invite up to 10 people at a time.'), data: null };
    }

    const { data, error: createError } = await supabase
      .from('task_spaces')
      .insert({
        owner_id: user.id,
        name: normalizedName,
        description: normalizedDescription || null,
      })
      .select()
      .single();

    if (createError || !data) {
      return { error: createError as Error, data: null };
    }

    const ownerEmail = user.email?.toLowerCase();
    const uniqueInvitees = Array.from(
      new Map(
        inviteEmails
          .map((invitee) => ({ ...invitee, email: invitee.email.trim().toLowerCase() }))
          .filter((invitee) => invitee.email && invitee.email !== ownerEmail)
          .map((invitee) => [invitee.email, invitee]),
      ).values(),
    );

    if (uniqueInvitees.length > 0) {
      const { error: memberError } = await supabase.from('task_space_members').insert(
        uniqueInvitees.map((invitee) => ({
          space_id: data.id,
          user_id: null,
          email: invitee.email,
          role: invitee.role,
          status: 'invited',
        })),
      );

      if (memberError) {
        await supabase.from('task_spaces').delete().eq('id', data.id);
        return { error: memberError as Error, data: null };
      }
    }

    setSpaces((previous) => [data as TaskSpace, ...previous]);
    const warning = await sendSpaceInvites(
      data.id,
      uniqueInvitees.map((invitee) => invitee.email),
    );

    return { error: null, data: data as TaskSpace, warning };
  }

  async function deleteSpace(id: string) {
    const { error } = await supabase.from('task_spaces').delete().eq('id', id);
    if (!error) {
      setSpaces((previous) => previous.filter((space) => space.id !== id));
    }
    return { error: error as Error | null };
  }

  return { spaces, loading, error, fetchSpaces, createSpace, deleteSpace };
}

export function useSpaceDetails(spaceId: string) {
  const { user } = useAuth();
  const [members, setMembers] = useState<TaskSpaceMember[]>([]);
  const [tasks, setTasks] = useState<SharedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'owner' | CollaboratorRole>('viewer');

  const fetchDetails = useCallback(async () => {
    if (!user || !spaceId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [membersResult, tasksResult, spaceResult] = await Promise.all([
      supabase.from('task_space_members').select('*').eq('space_id', spaceId),
      supabase.from('shared_tasks').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }),
      supabase.from('task_spaces').select('owner_id').eq('id', spaceId).single(),
    ]);

    if (membersResult.error || tasksResult.error || spaceResult.error) {
      setError(
        membersResult.error?.message
        || tasksResult.error?.message
        || spaceResult.error?.message
        || 'Failed to load the shared space.',
      );
      setLoading(false);
      return;
    }

    const nextMembers = (membersResult.data || []) as TaskSpaceMember[];
    setMembers(nextMembers);
    setTasks((tasksResult.data || []) as SharedTask[]);

    if (spaceResult.data?.owner_id === user.id) {
      setUserRole('owner');
    } else {
      const membership = nextMembers.find(
        (member) => member.user_id === user.id && member.status === 'accepted',
      );
      setUserRole(membership?.role || 'viewer');
    }

    setLoading(false);
  }, [spaceId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    if (!user || !spaceId) return;

    const channel = supabase
      .channel(`space-details:${spaceId}:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_space_members', filter: `space_id=eq.${spaceId}` },
        () => { void fetchDetails(); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shared_tasks', filter: `space_id=eq.${spaceId}` },
        () => { void fetchDetails(); },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchDetails, spaceId, user]);

  async function inviteMember(email: string, role: CollaboratorRole = 'editor') {
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 254) {
      return { error: new Error('Enter a valid email address.') };
    }
    if (normalizedEmail === user?.email?.trim().toLowerCase()) {
      return { error: new Error('You already own this space, so you cannot invite yourself.') };
    }

    const existing = members.find(
      (member) => member.email.toLowerCase() === normalizedEmail && member.status !== 'removed',
    );

    if (existing?.status === 'accepted') {
      return { error: new Error('This person is already a member.') };
    }

    if (existing?.status === 'invited') {
      if (existing.role !== role) {
        const { error: roleError } = await supabase
          .from('task_space_members')
          .update({ role })
          .eq('id', existing.id);
        if (roleError) return { error: roleError as Error };
      }

      if (!existing.invite_token || existing.invite_send_count >= 5) {
        const { error: renewalError } = await supabase.rpc('renew_space_invite', {
          p_member_id: existing.id,
        });
        if (renewalError) return { error: renewalError as Error };
      }

      return { error: await sendSpaceInvites(spaceId, [normalizedEmail]) };
    }

    const { data, error } = await supabase
      .from('task_space_members')
      .insert({
        space_id: spaceId,
        user_id: null,
        email: normalizedEmail,
        role,
        status: 'invited',
      })
      .select()
      .single();

    if (error || !data) return { error: error as Error };

    setMembers((previous) => [...previous, data as TaskSpaceMember]);
    return { error: await sendSpaceInvites(spaceId, [normalizedEmail]) };
  }

  async function removeMember(memberId: string) {
    const { error } = await supabase.from('task_space_members').delete().eq('id', memberId);
    if (!error) {
      setMembers((previous) => previous.filter((member) => member.id !== memberId));
    }
    return { error: error as Error | null };
  }

  async function createSharedTask(taskData: {
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    due_date?: string;
  }) {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('shared_tasks')
      .insert({
        space_id: spaceId,
        created_by: user.id,
        title: taskData.title,
        description: taskData.description || null,
        priority: taskData.priority || 'medium',
        due_date: taskData.due_date || null,
        status: 'active',
      })
      .select()
      .single();

    if (!error && data) {
      setTasks((previous) => [data as SharedTask, ...previous]);
    }
    return { error: error as Error | null, data };
  }

  async function updateSharedTask(id: string, updates: Partial<SharedTask>) {
    const { data, error } = await supabase
      .from('shared_tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      setTasks((previous) => previous.map((task) => (task.id === id ? data as SharedTask : task)));
    }
    return { error: error as Error | null };
  }

  async function deleteSharedTask(id: string) {
    const { error } = await supabase.from('shared_tasks').delete().eq('id', id);
    if (!error) {
      setTasks((previous) => previous.filter((task) => task.id !== id));
    }
    return { error: error as Error | null };
  }

  return {
    members,
    tasks,
    loading,
    error,
    userRole,
    fetchDetails,
    inviteMember,
    removeMember,
    createSharedTask,
    updateSharedTask,
    deleteSharedTask,
  };
}

export interface CalendarSharedTask extends SharedTask {
  space_name: string;
  canEdit: boolean;
}

/**
 * Every shared task with a due date across every space the user can see (owned
 * or accepted membership), for the Calendar's day view. RLS already scopes the
 * `shared_tasks` select to spaces the user is authorized for, so this reads
 * cleanly without enumerating space ids up front. Role is resolved the same
 * way useSpaceDetails does it (owner via task_spaces.owner_id, otherwise the
 * accepted task_space_members row), just for many spaces at once.
 */
export function useSharedTasksForCalendar() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<CalendarSharedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [tasksResult, membershipsResult] = await Promise.all([
      supabase
        .from('shared_tasks')
        .select('*, task_spaces(name, owner_id)')
        .not('due_date', 'is', null),
      supabase
        .from('task_space_members')
        .select('space_id, role')
        .eq('user_id', user.id)
        .eq('status', 'accepted'),
    ]);

    if (tasksResult.error || membershipsResult.error) {
      setError(tasksResult.error?.message || membershipsResult.error?.message || 'Failed to load shared tasks.');
      setLoading(false);
      return;
    }

    const roleBySpace = new Map(
      (membershipsResult.data || []).map((membership) => [
        membership.space_id as string,
        membership.role as CollaboratorRole,
      ]),
    );

    // The generated Database type has no FK relationships (`Relationships: []`
    // on every table), so supabase-js can't type this embed and infers an
    // error type for `task_spaces` instead — cast through `unknown` since the
    // shape is correct at runtime (PostgREST resolves the embed from the
    // actual FK regardless of what's declared in our local types).
    type SharedTaskRow = SharedTask & { task_spaces: { name: string; owner_id: string } | null };
    const rows = (tasksResult.data || []) as unknown as SharedTaskRow[];
    const nextTasks: CalendarSharedTask[] = rows.map((row) => {
      const { task_spaces, ...task } = row;
      const isOwner = task_spaces?.owner_id === user.id;
      const role = roleBySpace.get(task.space_id);
      return {
        ...task,
        space_name: task_spaces?.name || 'Shared space',
        canEdit: isOwner || role === 'editor',
      };
    });

    setTasks(nextTasks);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`calendar-shared-tasks:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_tasks' }, () => {
        void fetchTasks();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchTasks, user]);

  function mergeTask(id: string, data: Partial<SharedTask>) {
    setTasks((previous) => previous.map((task) => (task.id === id ? { ...task, ...data } : task)));
  }

  async function toggleSharedTask(id: string) {
    const current = tasks.find((task) => task.id === id);
    if (!current) return { error: new Error('Task not found') };

    const nextStatus = current.status === 'completed' ? 'active' : 'completed';
    const { data, error } = await supabase
      .from('shared_tasks')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) mergeTask(id, data as SharedTask);
    return { error: error as Error | null };
  }

  async function updateSharedTask(id: string, updates: Partial<SharedTask>) {
    const { data, error } = await supabase
      .from('shared_tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) mergeTask(id, data as SharedTask);
    return { error: error as Error | null };
  }

  async function deleteSharedTask(id: string) {
    const { error } = await supabase.from('shared_tasks').delete().eq('id', id);
    if (!error) {
      setTasks((previous) => previous.filter((task) => task.id !== id));
    }
    return { error: error as Error | null };
  }

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    toggleSharedTask,
    updateSharedTask,
    deleteSharedTask,
  };
}
