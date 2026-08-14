import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('supabase/functions/send-space-invite/index.ts', 'utf8');

describe('send-space-invite Edge Function', () => {
  it('claims and completes database-tracked deliveries', () => {
    expect(source).toMatch(/claim_space_invites_for_delivery/);
    expect(source).toMatch(/complete_space_invite_delivery/);
    expect(source).not.toMatch(/invite_send_count:\s*invitation\.invite_send_count \+ 1/);
  });

  it('requires an explicit production sender', () => {
    expect(source).toMatch(/Deno\.env\.get\('RESEND_FROM_EMAIL'\)/);
    expect(source).not.toContain('onboarding@resend.dev');
  });
});
