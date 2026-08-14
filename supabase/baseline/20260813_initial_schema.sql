begin;

-- Snapshot of the schema that existed before migration tracking was enabled.
-- Run this only for a brand-new Supabase project, then apply migrations in order.
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

grant select, insert, update, delete on all tables in schema public to authenticated;

create function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
begin
  return;
end;
$$;

create function public.handle_new_user()
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;
