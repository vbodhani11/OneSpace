import { describe, expect, it } from 'vitest';
import { formatDate } from './utils';

describe('formatDate', () => {
  it('keeps a date-only value on the selected calendar day', () => {
    expect(formatDate('2026-08-14')).toBe('Aug 14, 2026');
  });
});
