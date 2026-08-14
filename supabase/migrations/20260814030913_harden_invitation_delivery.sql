begin;

-- A short-lived database claim makes email delivery safe when two browser tabs,
-- retries, or concurrent Edge Function executions target the same invitation.
alter table public.task_space_members
  add column delivery_claimed_at timestamptz;

create index task_space_members_delivery_claim_idx
  on public.task_space_members (space_id, delivery_claimed_at)
  where status = 'invited';

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
      and m.expires_at > now()
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

create or replace function public.complete_space_invite_delivery(
  p_member_id uuid,
  p_delivery_succeeded boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_updated boolean;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  update public.task_space_members as m
  set
    delivery_claimed_at = null,
    last_invited_at = case when p_delivery_succeeded then now() else m.last_invited_at end,
    invite_send_count = case when p_delivery_succeeded then m.invite_send_count + 1 else m.invite_send_count end
  from public.task_spaces as s
  where m.id = p_member_id
    and s.id = m.space_id
    and s.owner_id = v_user_id
    and m.status = 'invited'
    and m.delivery_claimed_at is not null
    and m.invite_send_count < 5
  returning true into v_updated;

  if not coalesce(v_updated, false) then
    raise exception using errcode = '42501', message = 'The invitation delivery claim is invalid.';
  end if;

  return true;
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
    expires_at = now() + interval '7 days',
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
    raise exception using errcode = '42501', message = 'Only the space owner can renew an active invitation.';
  end if;
end;
$$;

revoke all on function public.claim_space_invites_for_delivery(uuid, text[]) from public, anon, authenticated;
revoke all on function public.complete_space_invite_delivery(uuid, boolean) from public, anon, authenticated;
revoke all on function public.renew_space_invite(uuid) from public, anon, authenticated;

grant execute on function public.claim_space_invites_for_delivery(uuid, text[]) to authenticated;
grant execute on function public.complete_space_invite_delivery(uuid, boolean) to authenticated;
grant execute on function public.renew_space_invite(uuid) to authenticated;

commit;
