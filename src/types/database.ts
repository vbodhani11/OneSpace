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
  role: 'owner' | 'editor' | 'viewer';
  status: 'invited' | 'accepted' | 'removed';
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
  event_type: string;
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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Omit<Profile, 'created_at' | 'updated_at'>> & Pick<Profile, 'id'>;
        Update: Partial<Profile>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Task>;
      };
      task_spaces: {
        Row: TaskSpace;
        Insert: Omit<TaskSpace, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<TaskSpace>;
      };
      task_space_members: {
        Row: TaskSpaceMember;
        Insert: Omit<TaskSpaceMember, 'id' | 'created_at'> & { id?: string };
        Update: Partial<TaskSpaceMember>;
      };
      shared_tasks: {
        Row: SharedTask;
        Insert: Omit<SharedTask, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<SharedTask>;
      };
      journal_entries: {
        Row: JournalEntry;
        Insert: Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<JournalEntry>;
      };
      calendar_events: {
        Row: CalendarEvent;
        Insert: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<CalendarEvent>;
      };
      user_settings: {
        Row: UserSettings;
        Insert: Omit<UserSettings, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<UserSettings>;
      };
    };
  };
};
