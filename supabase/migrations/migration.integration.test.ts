// @vitest-environment node
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ownerId = 'ad4cc4e4-1935-4627-a187-e6bd73d836f1';
const memberId = 'f2020758-ef0f-45a3-b9bb-49913b5fd30e';
const spaceId = '229331ab-03fb-42ed-b0b5-65210809c9cc';
const inviteToken = 'dd775828-a990-4e10-9694-6f034e5de3a7';

const authBootstrapSql = `
create role anon nologin;
create role authenticated nologin;

create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant execute on function auth.jwt() to anon, authenticated;
`;

const fixtureSql = `
insert into auth.users (id, email) values
  ('${ownerId}', 'owner@example.com'),
  ('${memberId}', 'member@example.com');
insert into public.task_spaces (id, owner_id, name)
values ('${spaceId}', '${ownerId}', 'Migration test space');
insert into public.task_space_members (space_id, email, role, status)
values ('${spaceId}', 'member@example.com', 'editor', 'invited');
insert into public.shared_tasks (space_id, created_by, title)
values ('${spaceId}', '${ownerId}', 'Protected shared task');
`;

const baselineSql = readFileSync(
  'supabase/baseline/20260813_initial_schema.sql',
  'utf8',
);

const migration = readFileSync(
  'supabase/migrations/20260813173456_stabilize_collaboration_security.sql',
  'utf8',
);
const invitationDeliveryMigration = readFileSync(
  'supabase/migrations/20260814030913_harden_invitation_delivery.sql',
  'utf8',
);
const nonExpiringInviteMigration = readFileSync(
  'supabase/migrations/20260815163500_make_space_invites_non_expiring.sql',
  'utf8',
);

let database: PGlite;

async function assumeMember(email = 'member@example.com') {
  await database.exec(`
    set role authenticated;
    select set_config('request.jwt.claim.sub', '${memberId}', false);
    select set_config('request.jwt.claims', '{"email":"${email}"}', false);
  `);
}

async function assumeOwner() {
  await database.exec(`
    set role authenticated;
    select set_config('request.jwt.claim.sub', '${ownerId}', false);
    select set_config('request.jwt.claims', '{"email":"owner@example.com"}', false);
  `);
}

describe('collaboration security migration integration', () => {
  beforeAll(async () => {
    database = await PGlite.create();
    await database.exec(authBootstrapSql);
    await database.exec(baselineSql);
    await database.exec(fixtureSql);
    await database.exec(migration);
    await database.exec(invitationDeliveryMigration);
    await database.exec(nonExpiringInviteMigration);

    await database.exec(`
      reset role;
      update public.task_space_members
      set invite_token = '${inviteToken}', expires_at = null
      where space_id = '${spaceId}' and email = 'member@example.com';
    `);
  }, 30_000);

  afterAll(async () => {
    await database.close();
  });

  it('keeps invited users out and blocks direct acceptance updates', async () => {
    await assumeMember();

    const beforeAcceptance = await database.query<{ count: number }>(`
      select count(*)::int as count from public.task_spaces where id = '${spaceId}';
    `);
    expect(beforeAcceptance.rows[0].count).toBe(0);

    await database.exec(`
      update public.task_space_members
      set status = 'accepted', user_id = '${memberId}', accepted_at = now()
      where space_id = '${spaceId}';
      reset role;
    `);

    const membership = await database.query<{ status: string; user_id: string | null }>(`
      select status, user_id from public.task_space_members where space_id = '${spaceId}';
    `);
    expect(membership.rows[0]).toEqual({ status: 'invited', user_id: null });
  });

  it('claims delivery once, releases failures, enforces cooldown, and refreshes tokens without expiry', async () => {
    await database.exec('reset role;');
    await assumeOwner();

    const firstClaim = await database.query<{ member_id: string }>(`
      select member_id
      from public.claim_space_invites_for_delivery(
        '${spaceId}'::uuid,
        array['member@example.com']::text[]
      );
    `);
    expect(firstClaim.rows).toHaveLength(1);

    const duplicateClaim = await database.query<{ member_id: string }>(`
      select member_id
      from public.claim_space_invites_for_delivery(
        '${spaceId}'::uuid,
        array['member@example.com']::text[]
      );
    `);
    expect(duplicateClaim.rows).toHaveLength(0);

    await database.query(`
      select public.complete_space_invite_delivery('${firstClaim.rows[0].member_id}'::uuid, false);
    `);
    const retryClaim = await database.query<{ member_id: string }>(`
      select member_id
      from public.claim_space_invites_for_delivery(
        '${spaceId}'::uuid,
        array['member@example.com']::text[]
      );
    `);
    expect(retryClaim.rows).toHaveLength(1);

    await database.query(`
      select public.complete_space_invite_delivery('${retryClaim.rows[0].member_id}'::uuid, true);
    `);
    const deliveryState = await database.query<{
      delivery_claimed_at: string | null;
      invite_send_count: number;
      last_invited_at: string | null;
      expires_at: string | null;
    }>(`
      select delivery_claimed_at::text, invite_send_count, last_invited_at::text, expires_at::text
      from public.task_space_members
      where id = '${retryClaim.rows[0].member_id}';
    `);
    expect(deliveryState.rows[0].delivery_claimed_at).toBeNull();
    expect(deliveryState.rows[0].invite_send_count).toBe(1);
    expect(deliveryState.rows[0].last_invited_at).not.toBeNull();
    expect(deliveryState.rows[0].expires_at).toBeNull();

    const cooldownClaim = await database.query<{ member_id: string }>(`
      select member_id
      from public.claim_space_invites_for_delivery(
        '${spaceId}'::uuid,
        array['member@example.com']::text[]
      );
    `);
    expect(cooldownClaim.rows).toHaveLength(0);

    await database.exec(`
      reset role;
      update public.task_space_members
      set expires_at = null, invite_send_count = 5
      where space_id = '${spaceId}';
    `);
    await assumeOwner();
    const renewed = await database.query<{ token: string; token_expires_at: string | null }>(`
      select token::text, token_expires_at::text
      from public.renew_space_invite('${retryClaim.rows[0].member_id}'::uuid);
    `);
    expect(renewed.rows).toHaveLength(1);
    expect(renewed.rows[0].token).not.toBe(inviteToken);
    expect(renewed.rows[0].token_expires_at).toBeNull();

    await database.exec(`
      reset role;
      update public.task_space_members
      set
        invite_token = '${inviteToken}',
        expires_at = null,
        last_invited_at = null,
        invite_send_count = 0,
        delivery_claimed_at = null
      where space_id = '${spaceId}';
    `);
  });

  it('keeps pending links valid without an expiry and accepts the email-bound token', async () => {
    await database.exec('set role anon;');
    const preview = await database.query<{ space_id: string; expires_at: string | null }>(`
      select space_id::text, expires_at::text
      from public.get_space_invite_preview('${inviteToken}'::uuid);
    `);
    expect(preview.rows).toHaveLength(1);
    expect(preview.rows[0].space_id).toBe(spaceId);
    expect(preview.rows[0].expires_at).toBeNull();

    await database.exec('reset role;');
    await assumeMember('different@example.com');
    await expect(database.query(`
      select public.accept_space_invite('${inviteToken}'::uuid);
    `)).rejects.toThrow(/email address that received/i);

    await database.exec('reset role;');
    await assumeMember();
    const accepted = await database.query<{ space_id: string }>(`
      select public.accept_space_invite('${inviteToken}'::uuid) as space_id;
    `);
    expect(accepted.rows[0].space_id).toBe(spaceId);

    const afterAcceptance = await database.query<{ count: number; invite_token: string | null; expires_at: string | null }>(`
      select
        (select count(*)::int from public.task_spaces where id = '${spaceId}') as count,
        (select invite_token::text from public.task_space_members where space_id = '${spaceId}') as invite_token,
        (select expires_at::text from public.task_space_members where space_id = '${spaceId}') as expires_at;
    `);
    expect(afterAcceptance.rows[0].count).toBe(1);
    expect(afterAcceptance.rows[0].invite_token).toBeNull();
    expect(afterAcceptance.rows[0].expires_at).toBeNull();
  });
});
