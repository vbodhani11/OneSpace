import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard';

const useAuthMock = vi.hoisted(() => vi.fn());
const useTasksMock = vi.hoisted(() => vi.fn());
const useJournalMock = vi.hoisted(() => vi.fn());

vi.mock('../contexts/useAuth', () => ({ useAuth: useAuthMock }));
vi.mock('../hooks/useTasks', () => ({ useTasks: useTasksMock }));
vi.mock('../hooks/useJournal', () => ({ useJournal: useJournalMock }));

describe('Dashboard header', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1', email: 'vipul@example.com', user_metadata: { full_name: 'Vipul' } } });
    useTasksMock.mockReturnValue({
      tasks: [],
      loading: false,
      error: null,
      fetchTasks: vi.fn(),
      toggleTask: vi.fn(),
      createTask: vi.fn(),
    });
    useJournalMock.mockReturnValue({ createEntry: vi.fn() });
  });

  it('renders both the full and abbreviated "New task" labels so the button never text-wraps on narrow screens', () => {
    render(<Dashboard />);

    // The button carries a full-width label for wider viewports and a short
    // "New" label for narrow ones (Tailwind's `sm:` breakpoint toggles which
    // is visible); jsdom does not evaluate media queries, so both must exist
    // in the markup rather than checking for one visible label.
    const newTaskButton = screen.getByRole('button', { name: /New task/ });
    expect(newTaskButton).toHaveTextContent('New task');
    expect(newTaskButton).toHaveTextContent('New');
    expect(newTaskButton.className).toContain('whitespace-nowrap');
  });

  it('renders a quick voice journal shortcut in the header', () => {
    render(<Dashboard />);

    expect(screen.getByRole('button', { name: 'Start a quick voice journal entry' })).toBeInTheDocument();
  });
});
