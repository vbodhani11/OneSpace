begin;

-- OneSpace invitations remain pending until they are accepted or explicitly
-- removed by the space owner. Accepted memberships already have no expiry.
update public.task_space_members
set expires_at = null
where status = 'invited'
  and expires_at is not null;

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
    and m.status = 'invited';
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
  v_member_user_id uuid;
  v_user_id uuid := auth.uid();
  v_user_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_user_id is null or v_user_email = '' then
    raise exception using errcode = '42501', message = 'You must sign in to accept this invitation.';
  end if;

  select m.id, m.space_id, lower(m.email), m.status, m.user_id
  into v_member_id, v_space_id, v_invited_email, v_status, v_member_user_id
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

create or replace function public.claim_space_invites_for_delivery(
  p_space_id uuid,
  p_invitee_emails text[]
)
returns table (
  member_id uuid,
  invitee_email text,
  invitee_role text,
  token uuid,
  token_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  if coalesce(cardinality(p_invitee_emails), 0) < 1
    or cardinality(p_invitee_emails) > 10 then
    raise exception using errcode = '22023', message = 'Send between 1 and 10 invitations at a time.';
  end if;

  if not exists (
    select 1
    from public.task_spaces as s
    where s.id = p_space_id
      and s.owner_id = v_user_id
  ) then
    raise exception using errcode = '42501', message = 'Only the space owner can send invitations.';
  end if;

  return query
  with requested_emails as (
    select distinct lower(trim(requested.email)) as email
    from unnest(p_invitee_emails) as requested(email)
    where trim(requested.email) <> ''
  ), candidates as (
    select m.id
    from public.task_space_members as m
    join requested_emails as requested on requested.email = lower(m.email)
    where m.space_id = p_space_id
      and m.status = 'invited'
      and m.invite_token is not null
      and m.invite_send_count < 5
      and (m.last_invited_at is null or m.last_invited_at <= now() - interval '10 minutes')
      and (m.delivery_claimed_at is null or m.delivery_claimed_at <= now() - interval '5 minutes')
    order by m.created_at
    for update of m skip locked
  )
  update public.task_space_members as m
  set delivery_claimed_at = now()
  from candidates
  where m.id = candidates.id
  returning m.id, m.email, m.role, m.invite_token, m.expires_at;
end;
$$;

create or replace function public.renew_space_invite(p_member_id uuid)
returns table (
  token uuid,
  token_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  return query
  update public.task_space_members as m
  set
    invite_token = gen_random_uuid(),
    expires_at = null,
    last_invited_at = null,
    invite_send_count = 0,
    delivery_claimed_at = null,
    user_id = null,
    accepted_at = null
  from public.task_spaces as s
  where m.id = p_member_id
    and s.id = m.space_id
    and s.owner_id = v_user_id
    and m.status = 'invited'
  returning m.invite_token, m.expires_at;

  if not found then
    raise exception using errcode = '42501', message = 'Only the space owner can refresh an active invitation.';
  end if;
end;
$$;

revoke all on function public.get_space_invite_preview(uuid) from public;
grant execute on function public.get_space_invite_preview(uuid) to anon, authenticated;

revoke all on function public.accept_space_invite(uuid) from public, anon;
grant execute on function public.accept_space_invite(uuid) to authenticated;

revoke all on function public.claim_space_invites_for_delivery(uuid, text[]) from public, anon, authenticated;
revoke all on function public.renew_space_invite(uuid) from public, anon, authenticated;
grant execute on function public.claim_space_invites_for_delivery(uuid, text[]) to authenticated;
grant execute on function public.renew_space_invite(uuid) to authenticated;

commit;
