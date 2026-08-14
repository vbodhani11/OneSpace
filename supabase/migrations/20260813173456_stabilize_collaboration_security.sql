begin;

-- Invitation records are email-bound, expire after seven days, and are accepted
-- only through the guarded RPC below. The token replaces guessable space-id links.
alter table public.task_space_members
  add column invite_token uuid default gen_random_uuid(),
  add column expires_at timestamptz,
  add column accepted_at timestamptz,
  add column last_invited_at timestamptz,
  add column invite_send_count integer not null default 0;

update public.task_space_members
set
  invite_token = case
    when status = 'invited' then coalesce(invite_token, gen_random_uuid())
    else null
  end,
  expires_at = case
    when status = 'invited' then coalesce(expires_at, created_at + interval '7 days')
    else expires_at
  end,
  accepted_at = case
    when status = 'accepted' then coalesce(accepted_at, created_at)
    else accepted_at
  end;

alter table public.task_space_members
  alter column invite_token set default gen_random_uuid(),
  alter column role set not null,
  alter column status set not null,
  add constraint task_space_members_role_check
    check (role in ('editor', 'viewer')),
  add constraint task_space_members_status_check
    check (status in ('invited', 'accepted', 'removed')),
  add constraint task_space_members_invite_send_count_check
    check (invite_send_count between 0 and 5),
  add constraint task_space_members_acceptance_check
    check (
      (status = 'accepted' and user_id is not null and accepted_at is not null)
      or status in ('invited', 'removed')
    );

create unique index task_space_members_invite_token_key
  on public.task_space_members (invite_token)
  where invite_token is not null;

create unique index task_space_members_active_email_key
  on public.task_space_members (space_id, lower(email))
  where status <> 'removed';

-- Validate enum-like values already represented by TypeScript unions.
update public.tasks set status = 'active' where status is null;
update public.tasks set priority = 'medium' where priority is null;
alter table public.tasks
  alter column status set not null,
  alter column priority set not null,
  add constraint tasks_status_check check (status in ('active', 'completed', 'archived')),
  add constraint tasks_priority_check check (priority in ('low', 'medium', 'high'));

update public.shared_tasks set status = 'active' where status is null;
update public.shared_tasks set priority = 'medium' where priority is null;
alter table public.shared_tasks
  alter column status set not null,
  alter column priority set not null,
  add constraint shared_tasks_status_check check (status in ('active', 'completed', 'archived')),
  add constraint shared_tasks_priority_check check (priority in ('low', 'medium', 'high'));

update public.calendar_events set event_type = 'personal' where event_type is null;
alter table public.calendar_events
  alter column event_type set not null,
  add constraint calendar_events_type_check
    check (event_type in ('personal', 'work', 'health', 'social', 'other')),
  add constraint calendar_events_time_check
    check (end_time is null or end_time > start_time);

update public.user_settings set theme = 'dark' where theme is null;
alter table public.user_settings
  alter column theme set not null,
  add constraint user_settings_theme_check check (theme in ('dark', 'light', 'system'));

-- Index foreign keys and the filters/orderings used by the UI and RLS policies.
create index tasks_user_status_created_idx
  on public.tasks (user_id, status, created_at desc);
create index journal_entries_user_entry_date_idx
  on public.journal_entries (user_id, entry_date desc);
create index calendar_events_user_start_time_idx
  on public.calendar_events (user_id, start_time);
create index task_spaces_owner_id_idx
  on public.task_spaces (owner_id);
create index task_space_members_space_id_idx
  on public.task_space_members (space_id);
create index task_space_members_user_status_idx
  on public.task_space_members (user_id, status);
create index task_space_members_email_status_idx
  on public.task_space_members (lower(email), status);
create index shared_tasks_space_created_idx
  on public.shared_tasks (space_id, created_at desc);
create index shared_tasks_created_by_idx
  on public.shared_tasks (created_by);

-- Policy helpers live outside the exposed API schema. They bypass recursive RLS
-- checks but cannot be invoked through PostgREST as public RPCs.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_space_owner(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.task_spaces as s
    where s.id = p_space_id
      and s.owner_id = (select auth.uid())
  );
$$;

create or replace function private.is_space_member(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.task_space_members as m
    where m.space_id = p_space_id
      and m.user_id = (select auth.uid())
      and m.status = 'accepted'
  );
$$;

create or replace function private.is_space_editor(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.task_space_members as m
    where m.space_id = p_space_id
      and m.user_id = (select auth.uid())
      and m.role = 'editor'
      and m.status = 'accepted'
  );
$$;

revoke all on function private.is_space_owner(uuid) from public, anon;
revoke all on function private.is_space_member(uuid) from public, anon;
revoke all on function private.is_space_editor(uuid) from public, anon;
grant execute on function private.is_space_owner(uuid) to authenticated;
grant execute on function private.is_space_member(uuid) to authenticated;
grant execute on function private.is_space_editor(uuid) to authenticated;

-- Remove duplicate and unsafe policies before installing one explicit policy per
-- operation. In particular, invitees no longer have direct UPDATE access.
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users manage own profile" on public.profiles;

drop policy if exists "Users can create own tasks" on public.tasks;
drop policy if exists "Users can delete own tasks" on public.tasks;
drop policy if exists "Users can read own tasks" on public.tasks;
drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Users manage own tasks" on public.tasks;

drop policy if exists "Users can create own journal entries" on public.journal_entries;
drop policy if exists "Users can delete own journal entries" on public.journal_entries;
drop policy if exists "Users can read own journal entries" on public.journal_entries;
drop policy if exists "Users can update own journal entries" on public.journal_entries;
drop policy if exists "Users manage own journal" on public.journal_entries;

drop policy if exists "Users can create own calendar events" on public.calendar_events;
drop policy if exists "Users can delete own calendar events" on public.calendar_events;
drop policy if exists "Users can read own calendar events" on public.calendar_events;
drop policy if exists "Users can update own calendar events" on public.calendar_events;
drop policy if exists "Users manage own events" on public.calendar_events;

drop policy if exists "Users can create own settings" on public.user_settings;
drop policy if exists "Users can read own settings" on public.user_settings;
drop policy if exists "Users can update own settings" on public.user_settings;
drop policy if exists "Users manage own settings" on public.user_settings;

drop policy if exists ts_owner_all on public.task_spaces;
drop policy if exists ts_member_select on public.task_spaces;
drop policy if exists tsm_owner_all on public.task_space_members;
drop policy if exists tsm_self_select on public.task_space_members;
drop policy if exists tsm_self_update on public.task_space_members;
drop policy if exists st_member_select on public.shared_tasks;
drop policy if exists st_editor_insert on public.shared_tasks;
drop policy if exists st_editor_update on public.shared_tasks;
drop policy if exists st_editor_delete on public.shared_tasks;

drop function if exists public.is_space_owner(uuid);
drop function if exists public.is_space_member(uuid);
drop function if exists public.is_space_editor(uuid);

create policy profiles_select_own
on public.profiles for select to authenticated
using (id = (select auth.uid()));
create policy profiles_insert_own
on public.profiles for insert to authenticated
with check (id = (select auth.uid()));
create policy profiles_update_own
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy tasks_select_own
on public.tasks for select to authenticated
using (user_id = (select auth.uid()));
create policy tasks_insert_own
on public.tasks for insert to authenticated
with check (user_id = (select auth.uid()));
create policy tasks_update_own
on public.tasks for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy tasks_delete_own
on public.tasks for delete to authenticated
using (user_id = (select auth.uid()));

create policy journal_entries_select_own
on public.journal_entries for select to authenticated
using (user_id = (select auth.uid()));
create policy journal_entries_insert_own
on public.journal_entries for insert to authenticated
with check (user_id = (select auth.uid()));
create policy journal_entries_update_own
on public.journal_entries for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy journal_entries_delete_own
on public.journal_entries for delete to authenticated
using (user_id = (select auth.uid()));

create policy calendar_events_select_own
on public.calendar_events for select to authenticated
using (user_id = (select auth.uid()));
create policy calendar_events_insert_own
on public.calendar_events for insert to authenticated
with check (user_id = (select auth.uid()));
create policy calendar_events_update_own
on public.calendar_events for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy calendar_events_delete_own
on public.calendar_events for delete to authenticated
using (user_id = (select auth.uid()));

create policy user_settings_select_own
on public.user_settings for select to authenticated
using (user_id = (select auth.uid()));
create policy user_settings_insert_own
on public.user_settings for insert to authenticated
with check (user_id = (select auth.uid()));
create policy user_settings_update_own
on public.user_settings for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy task_spaces_select_collaborator
on public.task_spaces for select to authenticated
using (
  owner_id = (select auth.uid())
  or (select private.is_space_member(id))
);
create policy task_spaces_insert_owner
on public.task_spaces for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy task_spaces_update_owner
on public.task_spaces for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));
create policy task_spaces_delete_owner
on public.task_spaces for delete to authenticated
using (owner_id = (select auth.uid()));

create policy task_space_members_select_collaborator
on public.task_space_members for select to authenticated
using (
  (select private.is_space_owner(space_id))
  or (select private.is_space_member(space_id))
);
create policy task_space_members_insert_owner
on public.task_space_members for insert to authenticated
with check (
  (select private.is_space_owner(space_id))
  and role in ('editor', 'viewer')
  and status = 'invited'
  and user_id is null
);
create policy task_space_members_update_owner
on public.task_space_members for update to authenticated
using ((select private.is_space_owner(space_id)))
with check ((select private.is_space_owner(space_id)));
create policy task_space_members_delete_owner
on public.task_space_members for delete to authenticated
using ((select private.is_space_owner(space_id)));

create policy shared_tasks_select_collaborator
on public.shared_tasks for select to authenticated
using (
  (select private.is_space_owner(space_id))
  or (select private.is_space_member(space_id))
);
create policy shared_tasks_insert_editor
on public.shared_tasks for insert to authenticated
with check (
  (select private.is_space_owner(space_id))
  or (select private.is_space_editor(space_id))
);
create policy shared_tasks_update_editor
on public.shared_tasks for update to authenticated
using (
  (select private.is_space_owner(space_id))
  or (select private.is_space_editor(space_id))
)
with check (
  (select private.is_space_owner(space_id))
  or (select private.is_space_editor(space_id))
);
create policy shared_tasks_delete_editor
on public.shared_tasks for delete to authenticated
using (
  (select private.is_space_owner(space_id))
  or (select private.is_space_editor(space_id))
);

revoke all on public.task_spaces, public.task_space_members, public.shared_tasks from anon;
grant select, insert, update, delete
  on public.task_spaces, public.task_space_members, public.shared_tasks
  to authenticated;

-- A public preview reveals only non-sensitive space metadata. Possession of the
-- 128-bit token is required; accepting additionally requires the invited email.
create or replace function public.get_space_invite_preview(p_invite_token uuid)
returns table (
  space_id uuid,
  space_name text,
  description text,
  role text,
  status text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    s.name,
    s.description,
    m.role,
    m.status,
    m.expires_at
  from public.task_space_members as m
  join public.task_spaces as s on s.id = m.space_id
  where m.invite_token = p_invite_token
    and m.status = 'invited'
    and m.expires_at > now();
$$;

create or replace function public.accept_space_invite(p_invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_space_id uuid;
  v_invited_email text;
  v_status text;
  v_expires_at timestamptz;
  v_member_user_id uuid;
  v_user_id uuid := auth.uid();
  v_user_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_user_id is null or v_user_email = '' then
    raise exception using errcode = '42501', message = 'You must sign in to accept this invitation.';
  end if;

  select m.id, m.space_id, lower(m.email), m.status, m.expires_at, m.user_id
  into v_member_id, v_space_id, v_invited_email, v_status, v_expires_at, v_member_user_id
  from public.task_space_members as m
  where m.invite_token = p_invite_token
  for update;

  if not found or v_status = 'removed' then
    raise exception using errcode = 'P0001', message = 'This invitation is invalid or has been revoked.';
  end if;

  if v_invited_email <> v_user_email then
    raise exception using errcode = '42501', message = 'Sign in with the email address that received this invitation.';
  end if;

  if v_status = 'accepted' then
    if v_member_user_id = v_user_id then
      return v_space_id;
    end if;
    raise exception using errcode = '42501', message = 'This invitation belongs to another account.';
  end if;

  if v_expires_at is null or v_expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'This invitation has expired. Ask the space owner for a new invitation.';
  end if;

  update public.task_space_members
  set
    status = 'accepted',
    user_id = v_user_id,
    accepted_at = now(),
    expires_at = null,
    invite_token = null
  where id = v_member_id;

  return v_space_id;
end;
$$;

revoke all on function public.get_space_invite_preview(uuid) from public;
revoke all on function public.accept_space_invite(uuid) from public, anon;
grant execute on function public.get_space_invite_preview(uuid) to anon, authenticated;
grant execute on function public.accept_space_invite(uuid) to authenticated;

-- Trigger-only helpers do not need to be callable through the API. Qualifying
-- every object and fixing search_path removes the mutable-search-path warning.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Publish shared-space changes so accepted collaborators receive updates.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'task_spaces'
    ) then
      alter publication supabase_realtime add table public.task_spaces;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'task_space_members'
    ) then
      alter publication supabase_realtime add table public.task_space_members;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'shared_tasks'
    ) then
      alter publication supabase_realtime add table public.shared_tasks;
    end if;
  end if;
end;
$$;

commit;
