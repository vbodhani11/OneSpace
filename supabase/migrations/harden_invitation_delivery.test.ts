import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260814030913_harden_invitation_delivery.sql',
  'utf8',
);

describe('invitation delivery migration', () => {
  it('uses an expiring database claim to prevent duplicate delivery', () => {
    expect(migration).toMatch(/delivery_claimed_at/i);
    expect(migration).toMatch(/for update of m skip locked/i);
    expect(migration).toMatch(/claim_space_invites_for_delivery/i);
    expect(migration).toMatch(/complete_space_invite_delivery/i);
  });

  it('lets only authenticated owners execute invitation delivery RPCs', () => {
    expect(migration).toMatch(/s\.owner_id = v_user_id/i);
    expect(migration).toMatch(/revoke all on function public\.claim_space_invites_for_delivery\(uuid, text\[\]\)/i);
    expect(migration).toMatch(/grant execute on function public\.claim_space_invites_for_delivery\(uuid, text\[\]\) to authenticated/i);
  });

  it('renews expired invitation tokens without accepting the member', () => {
    expect(migration).toMatch(/create or replace function public\.renew_space_invite/i);
    expect(migration).toMatch(/invite_token = gen_random_uuid\(\)/i);
    expect(migration).toMatch(/expires_at = now\(\) \+ interval '7 days'/i);
    expect(migration).toMatch(/and m\.status = 'invited'/i);
  });
});
