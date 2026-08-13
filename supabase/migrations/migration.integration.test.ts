// @vitest-environment node
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ownerId = 'ad4cc4e4-1935-4627-a187-e6bd73d836f1';
const memberId = 'f2020758-ef0f-45a3-b9bb-49913b5fd30e';
const spaceId = '229331ab-03fb-42ed-b0b5-65210809c9cc';
const inviteToken = 'dd775828-a990-4e10-9694-6f034e5de3a7';

const bootstrapSql = `
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

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text default 'active',
  priority text default 'medium',
  due_date date,
  position_x numeric default 0,
  position_y numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.task_spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.task_space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.task_spaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  role text default 'editor',
  status text default 'invited',
  created_at timestamptz default now()
);
create table public.shared_tasks (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.task_spaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  status text default 'active',
  priority text default 'medium',
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  content text not null,
  mood text,
  entry_date date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz,
  event_type text default 'personal',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  theme text default 'dark',
  notifications_enabled boolean default true,
  sound_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_spaces enable row level security;
alter table public.task_space_members enable row level security;
alter table public.shared_tasks enable row level security;
alter table public.journal_entries enable row level security;
alter table public.calendar_events enable row level security;
alter table public.user_settings enable row level security;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

create function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$ begin return; end; $$;

insert into auth.users (id, email) values
  ('${ownerId}', 'owner@example.com'),
  ('${memberId}', 'member@example.com');
insert into public.profiles (id, email) values
  ('${ownerId}', 'owner@example.com'),
  ('${memberId}', 'member@example.com');
insert into public.task_spaces (id, owner_id, name)
values ('${spaceId}', '${ownerId}', 'Migration test space');
insert into public.task_space_members (space_id, email, role, status)
values ('${spaceId}', 'member@example.com', 'editor', 'invited');
insert into public.shared_tasks (space_id, created_by, title)
values ('${spaceId}', '${ownerId}', 'Protected shared task');
`;

const migration = readFileSync(
  'supabase/migrations/20260813125501_stabilize_collaboration_security.sql',
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

describe('collaboration security migration integration', () => {
  beforeAll(async () => {
    database = await PGlite.create();
    await database.exec(bootstrapSql);
    await database.exec(migration);

    await database.exec(`
      reset role;
      update public.task_space_members
      set invite_token = '${inviteToken}', expires_at = now() + interval '7 days'
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

  it('rejects the wrong email and accepts the email-bound token', async () => {
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

    const afterAcceptance = await database.query<{ count: number; invite_token: string | null }>(`
      select
        (select count(*)::int from public.task_spaces where id = '${spaceId}') as count,
        (select invite_token::text from public.task_space_members where space_id = '${spaceId}') as invite_token;
    `);
    expect(afterAcceptance.rows[0].count).toBe(1);
    expect(afterAcceptance.rows[0].invite_token).toBeNull();
  });
});
