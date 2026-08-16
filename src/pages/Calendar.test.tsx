import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Calendar } from './Calendar';
import { eventOccursOnLocalDate } from '../lib/utils';
import type { CalendarEvent, JournalEntry, Task } from '../types/database';
import type { CalendarSharedTask } from '../hooks/useTaskSpaces';

const useCalendarMock = vi.hoisted(() => vi.fn());
const useTasksMock = vi.hoisted(() => vi.fn());
const useJournalMock = vi.hoisted(() => vi.fn());
const useSharedTasksForCalendarMock = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useCalendar', () => ({ useCalendar: useCalendarMock }));
vi.mock('../hooks/useTasks', () => ({ useTasks: useTasksMock }));
vi.mock('../hooks/useJournal', () => ({ useJournal: useJournalMock }));
vi.mock('../hooks/useTaskSpaces', () => ({ useSharedTasksForCalendar: useSharedTasksForCalendarMock }));

const TODAY = '2026-08-16';
const OTHER_DAY = '2026-08-20';

function calendarReturn(events: CalendarEvent[] = []) {
  return {
    events,
    loading: false,
    error: null,
    fetchEvents: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    getEventsForDate: (date: string) => events.filter((event) => eventOccursOnLocalDate(event, date)),
  };
}

function tasksReturn(tasks: Task[] = []) {
  return {
    tasks,
    loading: false,
    error: null,
    fetchTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn().mockResolvedValue({ error: null }),
    toggleTask: vi.fn().mockResolvedValue({ error: null }),
    deleteTask: vi.fn().mockResolvedValue({ error: null }),
    clearCompleted: vi.fn(),
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

function journalReturn(entries: JournalEntry[] = []) {
  return {
    entries,
    loading: false,
    error: null,
    fetchEntries: vi.fn(),
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
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

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'event-1',
    user_id: 'user-1',
    title: 'Team sync',
    description: null,
    start_time: `${TODAY}T15:00:00.000Z`,
    end_time: null,
    event_type: 'work',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('Calendar date synchronization', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T09:00:00`));
    useSharedTasksForCalendarMock.mockReturnValue(sharedTasksReturn());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a task with a due date on the calendar for that day', () => {
    useCalendarMock.mockReturnValue(calendarReturn());
    useTasksMock.mockReturnValue(tasksReturn([makeTask({ due_date: TODAY })]));
    useJournalMock.mockReturnValue(journalReturn());

    render(<Calendar />);

    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    // The month-grid cell for today should also carry the task indicator.
    expect(screen.getByRole('button', { name: /Select 2026-08-16.*tasks due/ })).toBeInTheDocument();
  });

  it('moves the task to its new date when the due date changes', () => {
    useCalendarMock.mockReturnValue(calendarReturn());
    useJournalMock.mockReturnValue(journalReturn());
    useTasksMock.mockReturnValue(tasksReturn([makeTask({ due_date: TODAY })]));

    const { rerender } = render(<Calendar />);
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();

    // Simulate updateTask() resolving and the hook's local state moving the
    // task to a different due date — the day view for the still-selected
    // TODAY should no longer show it.
    useTasksMock.mockReturnValue(tasksReturn([makeTask({ due_date: OTHER_DAY })]));
    rerender(<Calendar />);

    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
    expect(screen.getByText('No tasks due this day')).toBeInTheDocument();
  });

  it('removes a deleted task from the day view', () => {
    useCalendarMock.mockReturnValue(calendarReturn());
    useJournalMock.mockReturnValue(journalReturn());
    useTasksMock.mockReturnValue(tasksReturn([makeTask({ due_date: TODAY })]));

    const { rerender } = render(<Calendar />);
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();

    useTasksMock.mockReturnValue(tasksReturn([]));
    rerender(<Calendar />);

    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
    expect(screen.getByText('No tasks due this day')).toBeInTheDocument();
  });

  it('shows a journal entry only on its own date', () => {
    useCalendarMock.mockReturnValue(calendarReturn());
    useTasksMock.mockReturnValue(tasksReturn());
    useJournalMock.mockReturnValue(journalReturn([makeEntry({ entry_date: TODAY })]));

    render(<Calendar />);

    expect(screen.getByText('Morning pages')).toBeInTheDocument();
    expect(screen.queryByText('No journal entry for this day')).not.toBeInTheDocument();
  });

  it('does not show a journal entry dated for a different day', () => {
    useCalendarMock.mockReturnValue(calendarReturn());
    useTasksMock.mockReturnValue(tasksReturn());
    useJournalMock.mockReturnValue(journalReturn([makeEntry({ entry_date: OTHER_DAY })]));

    render(<Calendar />);

    expect(screen.queryByText('Morning pages')).not.toBeInTheDocument();
    expect(screen.getByText('No journal entry for this day')).toBeInTheDocument();
  });

  it('keeps events, tasks, and journal entries in their own distinct day-view sections', () => {
    useCalendarMock.mockReturnValue(calendarReturn([makeEvent({ title: 'Team sync', start_time: `${TODAY}T15:00:00.000Z` })]));
    useTasksMock.mockReturnValue(tasksReturn([makeTask({ title: 'Buy groceries', due_date: TODAY })]));
    useJournalMock.mockReturnValue(journalReturn([makeEntry({ title: 'Morning pages', entry_date: TODAY })]));

    render(<Calendar />);

    const tasksHeading = screen.getByText(/^Tasks on/);
    const journalHeading = screen.getByText(/^Journal on/);
    const eventsHeading = screen.getByText(/^Events on/);

    // Three separate section headings exist, each owning only its own kind of item.
    expect(tasksHeading).toBeInTheDocument();
    expect(journalHeading).toBeInTheDocument();
    expect(eventsHeading).toBeInTheDocument();

    const tasksSection = tasksHeading.closest('div');
    const journalSection = journalHeading.closest('div');

    expect(tasksSection).toHaveTextContent('Buy groceries');
    expect(tasksSection).not.toHaveTextContent('Team sync');
    expect(tasksSection).not.toHaveTextContent('Morning pages');

    expect(journalSection).toHaveTextContent('Morning pages');
    expect(journalSection).not.toHaveTextContent('Buy groceries');
    expect(journalSection).not.toHaveTextContent('Team sync');
  });
});
