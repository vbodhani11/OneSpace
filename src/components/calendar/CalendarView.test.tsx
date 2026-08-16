import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarView } from './CalendarView';
import { toLocalDateKey } from '../../lib/utils';
import type { CalendarEvent } from '../../types/database';

const event: CalendarEvent = {
  id: 'a5f24d96-695d-49b5-bd6c-b0248f97bf59',
  user_id: '64e0cc18-c07e-401e-b27b-4edc97d44eb8',
  title: 'Planning session',
  description: 'Quarterly goals',
  start_time: '2026-08-13T14:30:00.000Z',
  end_time: '2026-08-13T15:30:00.000Z',
  event_type: 'work',
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
};

describe('CalendarView', () => {
  it('opens the selected event for editing', async () => {
    const onSelectEvent = vi.fn();
    render(
      <CalendarView
        events={[event]}
        selectedDate={toLocalDateKey(event.start_time)}
        onSelectDate={vi.fn()}
        onSelectEvent={onSelectEvent}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Edit Planning session' }));
    expect(onSelectEvent).toHaveBeenCalledWith(event);
  });

  describe('task and journal indicators on the month grid', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-16T09:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('marks a day with a due task without treating it as an event', () => {
      render(
        <CalendarView
          events={[]}
          selectedDate="2026-08-01"
          onSelectDate={vi.fn()}
          onSelectEvent={vi.fn()}
          taskDueDates={new Set(['2026-08-16'])}
        />,
      );

      const day = screen.getByRole('button', { name: 'Select 2026-08-16, has tasks due' });
      expect(day).toBeInTheDocument();
    });

    it('marks a day with a journal entry', () => {
      render(
        <CalendarView
          events={[]}
          selectedDate="2026-08-01"
          onSelectDate={vi.fn()}
          onSelectEvent={vi.fn()}
          journalDates={new Set(['2026-08-16'])}
        />,
      );

      const day = screen.getByRole('button', { name: 'Select 2026-08-16, has a journal entry' });
      expect(day).toBeInTheDocument();
    });

    it('combines all three indicators for a day with an event, a task, and a journal entry', () => {
      render(
        <CalendarView
          events={[event]}
          selectedDate="2026-08-01"
          onSelectDate={vi.fn()}
          onSelectEvent={vi.fn()}
          taskDueDates={new Set(['2026-08-13'])}
          journalDates={new Set(['2026-08-13'])}
        />,
      );

      const day = screen.getByRole('button', { name: 'Select 2026-08-13, has events, tasks due, a journal entry' });
      expect(day).toBeInTheDocument();
    });
  });
});
