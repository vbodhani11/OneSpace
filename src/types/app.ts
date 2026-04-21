export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'active' | 'completed' | 'archived';
export type SpaceRole = 'owner' | 'editor' | 'viewer';
export type MemberStatus = 'invited' | 'accepted' | 'removed';
export type Theme = 'dark' | 'light' | 'system';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

export interface FloatingTaskPosition {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface SpeechState {
  isListening: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
}

export interface CreateTaskForm {
  title: string;
  description?: string;
  priority: Priority;
  due_date?: string;
}

export interface CreateEventForm {
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  event_type: string;
}

export interface CreateJournalForm {
  title?: string;
  content: string;
  mood?: string;
  entry_date: string;
}

export interface InviteMemberForm {
  email: string;
  role: SpaceRole;
}
