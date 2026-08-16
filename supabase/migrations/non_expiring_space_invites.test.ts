import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260816023037_make_space_invites_non_expiring.sql',
  'utf8',
);

describe('non-expiring space invite migration', () => {
  it('removes expiry as a condition for preview, delivery, and acceptance', () => {
    expect(migration).toMatch(/create or replace function public\.get_space_invite_preview/i);
    expect(migration).toMatch(/create or replace function public\.accept_space_invite/i);
    expect(migration).toMatch(/create or replace function public\.claim_space_invites_for_delivery/i);
    expect(migration).not.toMatch(/expires_at\s*>\s*now\(\)/i);
    expect(migration).not.toMatch(/invitation has expired/i);
  });

  it('clears expiry on pending invites and token refreshes', () => {
    expect(migration).toMatch(/set expires_at = null\s+where status = 'invited'/i);
    expect(migration).toMatch(/invite_token = gen_random_uuid\(\),\s+expires_at = null/i);
  });

  it('keeps acceptance email-bound and invalidates the token after joining', () => {
    expect(migration).toMatch(/v_invited_email <> v_user_email/i);
    expect(migration).toMatch(/status = 'accepted'/i);
    expect(migration).toMatch(/accepted_at = now\(\)/i);
    expect(migration).toMatch(/invite_token = null/i);
  });
});
