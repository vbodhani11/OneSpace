import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260813173456_stabilize_collaboration_security.sql',
  'utf8',
);

describe('collaboration security migration', () => {
  it('accepts invitations only through the guarded RPC', () => {
    expect(migration).toMatch(/create or replace function public\.accept_space_invite/i);
    expect(migration).toMatch(/v_invited_email <> v_user_email/i);
    expect(migration).not.toMatch(/create policy tsm_self_update/i);
  });

  it('requires accepted membership for shared-space authorization', () => {
    expect(migration).toMatch(/m\.status = 'accepted'/i);
    expect(migration).toMatch(/set search_path = ''/i);
    expect(migration).toMatch(/private\.is_space_editor/i);
  });
});
