import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard';
import type { CalendarEvent, JournalEntry, Task } from '../types/database';
import type { CalendarSharedTask } from '../hooks/useTaskSpaces';

const useAuthMock = vi.hoisted(() => vi.fn());
const useTasksMock = vi.hoisted(() => vi.fn());
const useCalendarMock = vi.hoisted(() => vi.fn());
const useJournalMock = vi.hoisted(() => vi.fn());
const useSharedTasksForCalendarMock = vi.hoisted(() => vi.fn());

vi.mock('../contexts/useAuth', () => ({ useAuth: useAuthMock }));
vi.mock('../hooks/useTasks', () => ({ useTasks: useTasksMock }));
vi.mock('../hooks/useCalendar', () => ({ useCalendar: useCalendarMock }));
vi.mock('../hooks/useJournal', () => ({ useJournal: useJournalMock }));
vi.mock('../hooks/useTaskSpaces', () => ({ useSharedTasksForCalendar: useSharedTasksForCalendarMock }));

const TODAY = '2026-08-16';
const YESTERDAY = '2026-08-15';

function tasksReturn(tasks: Task[] = []) {
  return {
    tasks,
    loading: false,
    error: null,
    fetchTasks: vi.fn(),
    createTask: vi.fn().mockResolvedValue({ error: null }),
    updateTask: vi.fn().mockResolvedValue({ error: null }),
    toggleTask: vi.fn().mockResolvedValue({ error: null }),
    deleteTask: vi.fn().mockResolvedValue({ error: null }),
    clearCompleted: vi.fn(),
  };
}

function calendarReturn(events: CalendarEvent[] = []) {
  return {
    events,
    loading: false,
    error: null,
    fetchEvents: vi.fn(),
    createEvent: vi.fn().mockResolvedValue({ error: null }),
    updateEvent: vi.fn().mockResolvedValue({ error: null }),
    deleteEvent: vi.fn().mockResolvedValue({ error: null }),
    getEventsForDate: () => events,
  };
}

function journalReturn(entries: JournalEntry[] = []) {
  return {
    entries,
    loading: false,
    error: null,
    fetchEntries: vi.fn(),
    createEntry: vi.fn().mockResolvedValue({ error: null }),
    updateEntry: vi.fn().mockResolvedValue({ error: null }),
    deleteEntry: vi.fn(),
  };
}

function sharedTasksReturn(tasks: CalendarSharedTask[] = []) {
  return {
    tasks,
    loading: false,
    error: null,
    fetchTasks: vi.fn(),
    toggleSharedTask: vi.fn().mockResolvedValue({ error: null }),
    updateSharedTask: vi.fn().mockResolvedValue({ error: null }),
    deleteSharedTask: vi.fn().mockResolvedValue({ error: null }),
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    user_id: 'user-1',
    title: 'Buy groceries',
    description: null,
    status: 'active',
    priority: 'medium',
    due_date: TODAY,
    position_x: 0,
    position_y: 0,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeSharedTask(overrides: Partial<CalendarSharedTask> = {}): CalendarSharedTask {
  return {
    id: 'shared-1',
    space_id: 'space-1',
    created_by: 'other-user',
    title: 'Plan the trip',
    description: null,
    status: 'active',
    priority: 'medium',
    due_date: TODAY,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    space_name: 'Family Chores',
    canEdit: true,
    ...overrides,
  };
}

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'event-1',
    user_id: 'user-1',
    title: 'Team sync',
    description: null,
    start_time: `${TODAY}T15:00:00.000Z`,
    end_time: `${TODAY}T15:30:00.000Z`,
    event_type: 'work',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 'entry-1',
    user_id: 'user-1',
    title: 'Morning pages',
    content: 'Feeling good today.',
    mood: null,
    entry_date: TODAY,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('Dashboard (Today view)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 09:00 UTC on TODAY so the 15:00 UTC fixture event is still upcoming.
    vi.setSystemTime(new Date(`${TODAY}T09:00:00.000Z`));
    useAuthMock.mockReturnValue({ user: { id: 'user-1', email: 'vipul@example.com', user_metadata: { full_name: 'Vipul' } } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the greeting and today's full date in the header", () => {
    useTasksMock.mockReturnValue(tasksReturn());
    useCalendarMock.mockReturnValue(calendarReturn());
    useJournalMock.mockReturnValue(journalReturn());
    useSharedTasksForCalendarMock.mockReturnValue(sharedTasksReturn());

    render(<Dashboard />);

    expect(screen.getByText('Vipul', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Sunday, August 16')).toBeInTheDocument();
  });

  it("shows today's events in chronological order and marks the next upcoming one", () => {
    useTasksMock.mockReturnValue(tasksReturn());
    useJournalMock.mockReturnValue(journalReturn());
    useSharedTasksForCalendarMock.mockReturnValue(sharedTasksReturn());
    useCalendarMock.mockReturnValue(calendarReturn([
      makeEvent({ id: 'e-later', title: 'Later meeting', start_time: `${TODAY}T18:00:00.000Z`, end_time: `${TODAY}T18:30:00.000Z` }),
      makeEvent({ id: 'e-soon', title: 'Standup', start_time: `${TODAY}T10:00:00.000Z`, end_time: `${TODAY}T10:15:00.000Z` }),
    ]));

    render(<Dashboard />);

    const events = screen.getAllByRole('button', { name: /^Edit/ });
    expect(events[0]).toHaveAccessibleName('Edit Standup');
    expect(events[1]).toHaveAccessibleName('Edit Later meeting');
    expect(events[0]).toHaveTextContent('Next up');
    expect(events[1]).not.toHaveTextContent('Next up');
  });

  it('shows an empty state with a quick-add link when there are no events today', () => {
    useTasksMock.mockReturnValue(tasksReturn());
    useJournalMock.mockReturnValue(journalReturn());
    useSharedTasksForCalendarMock.mockReturnValue(sharedTasksReturn());
    useCalendarMock.mockReturnValue(calendarReturn());

    render(<Dashboard />);

    expect(screen.getByText('No events today')).toBeInTheDocument();
    expect(screen.getByText('Add an event')).toBeInTheDocument();
  });

  it("shows personal tasks due today with their complete/incomplete state", () => {
    useCalendarMock.mockReturnValue(calendarReturn());
    useJournalMock.mockReturnValue(journalReturn());
    useSharedTasksForCalendarMock.mockReturnValue(sharedTasksReturn());
    useTasksMock.mockReturnValue(tasksReturn([
      makeTask({ id: 't-active', title: 'Buy groceries', status: 'active', due_date: TODAY }),
      makeTask({ id: 't-done', title: 'Finish report', status: 'completed', due_date: TODAY }),
      makeTask({ id: 't-other-day', title: 'Not today', status: 'active', due_date: '2026-08-20' }),
    ]));

    render(<Dashboard />);

    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    const doneTitle = screen.getByText('Finish report');
    expect(doneTitle.className).toContain('line-through');
    expect(screen.queryByText('Not today')).not.toBeInTheDocument();
  });

  it('shows a quick-add empty state when no personal tasks are due today', () => {
    useCalendarMock.mockReturnValue(calendarReturn());
    useJournalMock.mockReturnValue(journalReturn());
    useSharedTasksForCalendarMock.mockReturnValue(sharedTasksReturn());
    useTasksMock.mockReturnValue(tasksReturn());

    render(<Dashboard />);

    expect(screen.getByText('No personal tasks due today')).toBeInTheDocument();
    expect(screen.getByText('Add a task')).toBeInTheDocument();
  });

  it('shows shared-space tasks due today labeled with their space name', () => {
    useTasksMock.mockReturnValue(tasksReturn());
    useCalendarMock.mockReturnValue(calendarReturn());
    useJournalMock.mockReturnValue(journalReturn());
    useSharedTasksForCalendarMock.mockReturnValue(sharedTasksReturn([
      makeSharedTask({ title: 'Plan the trip', space_name: 'Family Chores', due_date: TODAY }),
    ]));

    render(<Dashboard />);

    expect(screen.getByText('Plan the trip')).toBeInTheDocument();
    expect(screen.getByText('Family Chores')).toBeInTheDocument();
  });

  it('hides shared-task edit controls for a viewer without edit permission', () => {
    useTasksMock.mockReturnValue(tasksReturn());
    useCalendarMock.mockReturnValue(calendarReturn());
    useJournalMock.mockReturnValue(journalReturn());
    useSharedTasksForCalendarMock.mockReturnValue(sharedTasksReturn([
      makeSharedTask({ title: 'Read-only task', canEdit: false, due_date: TODAY }),
    ]));

    render(<Dashboard />);

    expect(screen.getByText('Read-only task')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Read-only task' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Read-only task' })).not.toBeInTheDocument();
  });

  it('shows an empty message when no shared tasks are due today', () => {
    useTasksMock.mockReturnValue(tasksReturn());
    useCalendarMock.mockReturnValue(calendarReturn());
    useJournalMock.mockReturnValue(journalReturn());
    useSharedTasksForCalendarMock.mockReturnValue(sharedTasksReturn());

    render(<Dashboard />);

    expect(screen.getByText('No shared tasks due today')).toBeInTheDocument();
  });

  it('shows an Overdue section only when unfinished overdue tasks exist', () => {
    useCalendarMock.mockReturnValue(calendarReturn());
    useJournalMock.mockReturnValue(journalReturn());
    useTasksMock.mockReturnValue(tasksReturn([
      makeTask({ id: 't-overdue', title: 'Late task', status: 'active', due_date: YESTERDAY }),
    ]));
    useSharedTasksForCalendarMock.mockReturnValue(sharedTasksReturn());

    render(<Dashboard />);

    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Late task')).toBeInTheDocument();
  });

  it('does not show the Overdue section when nothing is overdue', () => {
    useCalendarMock.mockReturnValue(calendarReturn());
    useJournalMock.mockReturnValue(journalReturn());
    useSharedTasksForCalendarMock.mockReturnValue(sharedTasksReturn());
    useTasksMock.mockReturnValue(tasksReturn([makeTask({ due_date: TODAY })]));

    render(<Dashboard />);

    expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
  });

  it('does not count a completed task with a past due date as overdue', () => {
    useCalendarMock.mockReturnValue(calendarReturn());
    useJournalMock.mockReturnValue(journalReturn());
    useSharedTasksForCalendarMock.mockReturnValue(sharedTasksReturn());
    useTasksMock.mockReturnValue(tasksReturn([
      makeTask({ title: 'Already done', status: 'completed', due_date: YESTERDAY }),
    ]));

    render(<Dashboard />);

    expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
  });

  it("offers to open today's journal entry when one exists", () => {
    useTasksMock.mockReturnValue(tasksReturn());
    useCalendarMock.mockReturnValue(calendarReturn());
    useSharedTasksForCalendarMock.mockReturnValue(sharedTasksReturn());
    useJournalMock.mockReturnValue(journalReturn([makeEntry({ title: 'Morning pages', entry_date: TODAY })]));

    render(<Dashboard />);

    expect(screen.getByRole('button', { name: "Open today's journal entry" })).toBeInTheDocument();
    expect(screen.queryByText('Write about today')).not.toBeInTheDocument();
  });

  it("offers to write about today when no journal entry exists yet", () => {
    useTasksMock.mockReturnValue(tasksReturn());
    useCalendarMock.mockReturnValue(calendarReturn());
    useSharedTasksForCalendarMock.mockReturnValue(sharedTasksReturn());
    useJournalMock.mockReturnValue(journalReturn());

    render(<Dashboard />);

    expect(screen.getByText('Write about today')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "Open today's journal entry" })).not.toBeInTheDocument();
  });
});
