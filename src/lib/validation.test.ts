import { describe, expect, it } from 'vitest';
import { passwordSchema } from './validation';

describe('passwordSchema', () => {
  it('requires a long mixed-character password', () => {
    expect(passwordSchema.safeParse('password').success).toBe(false);
    expect(passwordSchema.safeParse('Grapes!42').success).toBe(true);
  });
});
