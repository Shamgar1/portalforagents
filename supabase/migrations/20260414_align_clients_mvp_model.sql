create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'user_role'
  ) then
    create type public.user_role as enum ('agent', 'admin');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'client_status'
  ) then
    create type public.client_status as enum ('New', 'In Review', 'Approved', 'Funded');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'agent',
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  client_name text,
  status public.client_status default 'New',
  loan_amount numeric(12, 2) default 0,
  expected_commission numeric(12, 2) default 0,
  agent_id uuid references public.profiles(id) on delete restrict,
  monday_item_id text,
  created_at timestamptz default now()
);

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists role public.user_role default 'agent',
  add column if not exists created_at timestamptz default now();

update public.profiles
set
  full_name = coalesce(full_name, 'Unknown User'),
  role = coalesce(role, 'agent'::public.user_role),
  created_at = coalesce(created_at, now())
where
  full_name is null
  or role is null
  or created_at is null;

alter table public.profiles
  alter column full_name set not null,
  alter column role set default 'agent',
  alter column role set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

alter table public.clients
  add column if not exists client_name text,
  add column if not exists status public.client_status default 'New',
  add column if not exists loan_amount numeric(12, 2) default 0,
  add column if not exists expected_commission numeric(12, 2) default 0,
  add column if not exists agent_id uuid references public.profiles(id) on delete restrict,
  add column if not exists monday_item_id text,
  add column if not exists created_at timestamptz default now();

update public.clients
set
  client_name = coalesce(client_name, 'Unknown Client'),
  status = coalesce(status, 'New'::public.client_status),
  loan_amount = coalesce(loan_amount, 0),
  expected_commission = coalesce(expected_commission, 0),
  created_at = coalesce(created_at, now())
where
  client_name is null
  or status is null
  or loan_amount is null
  or expected_commission is null
  or created_at is null;

alter table public.clients
  alter column client_name set not null,
  alter column status set default 'New',
  alter column status set not null,
  alter column loan_amount set default 0,
  alter column loan_amount set not null,
  alter column expected_commission set default 0,
  alter column expected_commission set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_agent_id_fkey'
      and conrelid = 'public.clients'::regclass
  ) then
    alter table public.clients
      add constraint clients_agent_id_fkey
      foreign key (agent_id) references public.profiles(id) on delete restrict;
  end if;
end
$$;

create index if not exists clients_agent_id_idx on public.clients(agent_id);
create index if not exists clients_status_idx on public.clients(status);
create index if not exists clients_created_at_idx on public.clients(created_at desc);
