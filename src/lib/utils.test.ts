import { describe, expect, it } from 'vitest';
import { eventOccursOnLocalDate, formatDate, formatFullDate } from './utils';
import type { CalendarEvent } from '../types/database';

describe('formatDate', () => {
  it('keeps a date-only value on the selected calendar day', () => {
    expect(formatDate('2026-08-14')).toBe('Aug 14, 2026');
  });
});

describe('formatFullDate', () => {
  it('keeps a date-only value on the selected calendar day', () => {
    expect(formatFullDate('2026-08-14')).toBe('Friday, August 14');
  });
});

describe('eventOccursOnLocalDate', () => {
  const event: CalendarEvent = {
    id: '8aa6b987-086b-4354-8643-31efb7061ee1',
    user_id: '5a9ab337-471b-4d4b-883a-30bbeb3de092',
    title: 'Overnight work',
    description: null,
    start_time: '2026-08-13T22:00:00',
    end_time: '2026-08-14T02:00:00',
    event_type: 'work',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
  };

  it('includes a multi-day event on every local date it overlaps', () => {
    expect(eventOccursOnLocalDate(event, '2026-08-13')).toBe(true);
    expect(eventOccursOnLocalDate(event, '2026-08-14')).toBe(true);
    expect(eventOccursOnLocalDate(event, '2026-08-15')).toBe(false);
  });
});
