import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { TaskSpace, TaskSpaceMember, SharedTask } from '../types/database';

export function useTaskSpaces() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<TaskSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpaces = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data: ownedSpaces } = await supabase
      .from('task_spaces')
      .select('*')
      .eq('owner_id', user.id);

    const { data: memberSpaces } = await supabase
      .from('task_space_members')
      .select('space_id')
      .eq('email', user.email || '')
      .neq('status', 'removed');

    const memberSpaceIds = (memberSpaces || []).map((m) => m.space_id);

    let allSpaces: TaskSpace[] = ownedSpaces || [];

    if (memberSpaceIds.length > 0) {
      const { data: invitedSpaces } = await supabase
        .from('task_spaces')
        .select('*')
        .in('id', memberSpaceIds)
        .neq('owner_id', user.id);

      allSpaces = [...allSpaces, ...(invitedSpaces || [])];
    }

    setSpaces(allSpaces);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  async function createSpace(
    name: string,
    description?: string,
    inviteEmails?: { email: string; role: 'editor' | 'viewer' }[]
  ) {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('task_spaces')
      .insert({ owner_id: user.id, name, description: description || null })
      .select()
      .single();

    if (!error && data) {
      setSpaces((prev) => [data, ...prev]);

      // Bulk-insert invitees
      if (inviteEmails && inviteEmails.length > 0) {
        const rows = inviteEmails
          .filter((i) => i.email.trim() && i.email !== user.email)
          .map((i) => ({
            space_id: data.id,
            email: i.email.trim().toLowerCase(),
            role: i.role,
            status: 'invited',
          }));

        if (rows.length > 0) {
          await supabase.from('task_space_members').insert(rows as never);
        }

        // Trigger email notifications via Supabase edge function (non-blocking)
        try {
          await supabase.functions.invoke('send-space-invite', {
            body: {
              spaceId: data.id,
              spaceName: name,
              inviterName: user.user_metadata?.full_name || user.email,
              inviterEmail: user.email,
              invitees: rows.map((r) => ({ email: r.email, role: r.role })),
              inviteUrl: `${window.location.origin}/invite/${data.id}`,
            },
          });
        } catch {
          // Edge function not deployed — invites still exist in DB
        }
      }
    }
    return { error: error as Error | null, data };
  }

  async function deleteSpace(id: string) {
    const { error } = await supabase.from('task_spaces').delete().eq('id', id);
    if (!error) {
      setSpaces((prev) => prev.filter((s) => s.id !== id));
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
  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'viewer'>('viewer');

  const fetchDetails = useCallback(async () => {
    if (!user || !spaceId) return;
    setLoading(true);
    setError(null);

    const [membersRes, tasksRes, spaceRes] = await Promise.all([
      supabase.from('task_space_members').select('*').eq('space_id', spaceId),
      supabase.from('shared_tasks').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }),
      supabase.from('task_spaces').select('owner_id').eq('id', spaceId).single(),
    ]);

    setMembers(membersRes.data || []);
    setTasks(tasksRes.data || []);

    if (spaceRes.data?.owner_id === user.id) {
      setUserRole('owner');
    } else {
      const myMembership = membersRes.data?.find((m) => m.email === user.email);
      setUserRole((myMembership?.role as 'editor' | 'viewer') || 'viewer');
    }

    if (membersRes.error || tasksRes.error) {
      setError(membersRes.error?.message || tasksRes.error?.message || 'Failed to load');
    }
    setLoading(false);
  }, [user, spaceId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  async function inviteMember(
    email: string,
    role: 'editor' | 'viewer' = 'editor',
    spaceName?: string,
  ) {
    const normalised = email.trim().toLowerCase();

    // Check not already a member
    const already = members.find((m) => m.email === normalised && m.status !== 'removed');
    if (already) return { error: new Error('This person is already invited.') };

    const { data, error } = await supabase
      .from('task_space_members')
      .insert({ space_id: spaceId, email: normalised, role, status: 'invited' })
      .select()
      .single();

    if (!error && data) {
      setMembers((prev) => [...prev, data]);

      // Send email (non-blocking)
      try {
        await supabase.functions.invoke('send-space-invite', {
          body: {
            spaceId,
            spaceName: spaceName || 'a shared space',
            inviterName: user?.user_metadata?.full_name || user?.email,
            inviterEmail: user?.email,
            invitees: [{ email: normalised, role }],
            inviteUrl: `${window.location.origin}/invite/${spaceId}`,
          },
        });
      } catch {
        // Edge function not deployed — invite still created in DB
      }
    }
    return { error: error as Error | null };
  }

  async function removeMember(memberId: string) {
    const { error } = await supabase.from('task_space_members').delete().eq('id', memberId);
    if (!error) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
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
      setTasks((prev) => [data, ...prev]);
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
      setTasks((prev) => prev.map((t) => (t.id === id ? data : t)));
    }
    return { error: error as Error | null };
  }

  async function deleteSharedTask(id: string) {
    const { error } = await supabase.from('shared_tasks').delete().eq('id', id);
    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
    return { error: error as Error | null };
  }

  return {
    members, tasks, loading, error, userRole,
    fetchDetails, inviteMember, removeMember,
    createSharedTask, updateSharedTask, deleteSharedTask,
  };
}
