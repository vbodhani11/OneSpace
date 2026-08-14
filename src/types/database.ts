export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'active' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
}

export interface TaskSpace {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskSpaceMember {
  id: string;
  space_id: string;
  user_id: string | null;
  email: string;
  role: 'editor' | 'viewer';
  status: 'invited' | 'accepted' | 'removed';
  invite_token: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  last_invited_at: string | null;
  invite_send_count: number;
  delivery_claimed_at: string | null;
  created_at: string;
}

export interface SharedTask {
  id: string;
  space_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  status: 'active' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  mood: string | null;
  entry_date: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  event_type: 'personal' | 'work' | 'health' | 'social' | 'other';
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  theme: 'dark' | 'light' | 'system';
  notifications_enabled: boolean;
  sound_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpaceInvitePreview {
  space_id: string;
  space_name: string;
  description: string | null;
  role: 'editor' | 'viewer';
  status: 'invited';
  expires_at: string;
}

type TableDefinition<Row, Insert, Update> = {
  Row: Row & Record<string, unknown>;
  Insert: Insert & Record<string, unknown>;
  Update: Update & Record<string, unknown>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<
        Profile,
        Partial<Omit<Profile, 'created_at' | 'updated_at'>> & Pick<Profile, 'id'>,
        Partial<Profile>
      >;
      tasks: TableDefinition<
        Task,
        Omit<Task, 'id' | 'created_at' | 'updated_at'> & { id?: string },
        Partial<Task>
      >;
      task_spaces: TableDefinition<
        TaskSpace,
        Omit<TaskSpace, 'id' | 'created_at' | 'updated_at'> & { id?: string },
        Partial<TaskSpace>
      >;
      task_space_members: TableDefinition<
        TaskSpaceMember,
        Omit<
          TaskSpaceMember,
          'id' | 'created_at' | 'invite_token' | 'expires_at' | 'accepted_at' | 'last_invited_at' | 'invite_send_count' | 'delivery_claimed_at'
        > & {
          id?: string;
          invite_token?: string | null;
          expires_at?: string | null;
          accepted_at?: string | null;
          last_invited_at?: string | null;
          invite_send_count?: number;
          delivery_claimed_at?: string | null;
        },
        Partial<TaskSpaceMember>
      >;
      shared_tasks: TableDefinition<
        SharedTask,
        Omit<SharedTask, 'id' | 'created_at' | 'updated_at'> & { id?: string },
        Partial<SharedTask>
      >;
      journal_entries: TableDefinition<
        JournalEntry,
        Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'> & { id?: string },
        Partial<JournalEntry>
      >;
      calendar_events: TableDefinition<
        CalendarEvent,
        Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'> & { id?: string },
        Partial<CalendarEvent>
      >;
      user_settings: TableDefinition<
        UserSettings,
        Partial<Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
          & Pick<UserSettings, 'user_id'>
          & { id?: string },
        Partial<UserSettings>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      get_space_invite_preview: {
        Args: { p_invite_token: string };
        Returns: SpaceInvitePreview[];
      };
      accept_space_invite: {
        Args: { p_invite_token: string };
        Returns: string;
      };
      renew_space_invite: {
        Args: { p_member_id: string };
        Returns: { token: string; token_expires_at: string }[];
      };
      claim_space_invites_for_delivery: {
        Args: { p_space_id: string; p_invitee_emails: string[] };
        Returns: {
          member_id: string;
          invitee_email: string;
          invitee_role: 'editor' | 'viewer';
          token: string;
          token_expires_at: string;
        }[];
      };
      complete_space_invite_delivery: {
        Args: { p_member_id: string; p_delivery_succeeded: boolean };
        Returns: boolean;
      };
    };
  };
};
