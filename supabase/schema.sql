create extension if not exists "pgcrypto";

create type public.user_role as enum ('agent', 'admin', 'master', 'agent_number');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  agent_number text,
  role public.user_role not null default 'agent',
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  status text not null default 'חדש',
  loan_amount numeric(12, 2) not null default 0,
  expected_commission numeric(12, 2) not null default 0,
  master_payment numeric(12, 2) not null default 0,
  payment_to_agent_number numeric(12, 2) not null default 0,
  agent_number text,
  agent_id uuid not null references public.profiles(id) on delete restrict,
  monday_item_id text,
  source_board text not null default 'opportunities',
  referring_agent_text text,
  referring_factor_ref text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.clients
  alter column status type text using status::text;

alter table public.clients
  alter column status set default 'חדש';

alter table public.profiles
  add column if not exists agent_number text;

alter table public.clients
  add column if not exists source_board text not null default 'opportunities',
  add column if not exists referring_agent_text text,
  add column if not exists referring_factor_ref text,
  add column if not exists master_payment numeric(12, 2) not null default 0,
  add column if not exists payment_to_agent_number numeric(12, 2) not null default 0,
  add column if not exists agent_number text,
  add column if not exists last_synced_at timestamptz;

create index if not exists clients_agent_id_idx on public.clients(agent_id);
create index if not exists clients_agent_number_idx on public.clients(agent_number);
create index if not exists clients_status_idx on public.clients(status);
create index if not exists clients_created_at_idx on public.clients(created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, agent_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'agent'),
    nullif(trim(new.raw_user_meta_data->>'agent_number'), '')
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    role = excluded.role,
    agent_number = excluded.agent_number;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_user_agent_number()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select agent_number from public.profiles where id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
using (
  id = auth.uid() or public.current_user_role() in ('admin', 'master')
);

drop policy if exists "clients_select_agent_or_admin" on public.clients;
create policy "clients_select_agent_or_admin"
on public.clients
for select
using (
  agent_id = auth.uid()
  or public.current_user_role() in ('admin', 'master')
  or (
    public.current_user_role() = 'agent_number'
    and agent_number = public.current_user_agent_number()
  )
);

drop policy if exists "clients_insert_admin_only" on public.clients;
create policy "clients_insert_admin_only"
on public.clients
for insert
with check (
  public.current_user_role() = 'admin'
);

drop policy if exists "clients_update_admin_only" on public.clients;
create policy "clients_update_admin_only"
on public.clients
for update
using (
  public.current_user_role() = 'admin'
)
with check (
  public.current_user_role() = 'admin'
);

drop policy if exists "clients_delete_admin_only" on public.clients;
create policy "clients_delete_admin_only"
on public.clients
for delete
using (
  public.current_user_role() = 'admin'
);

insert into public.clients (
  client_name,
  status,
  loan_amount,
  expected_commission,
  agent_id,
  monday_item_id,
  source_board,
  referring_agent_text
)
select
  seed.client_name,
  seed.status,
  seed.loan_amount,
  seed.expected_commission,
  seed.agent_id,
  seed.monday_item_id,
  seed.source_board,
  seed.referring_agent_text
from (
  values
    ('נועם חדד', 'חדש', 250000, 5000, null::uuid, 'monday-1001', 'opportunities', 'שרה כהן'),
    ('מאיה אזולאי', 'בבדיקה', 420000, 8400, null::uuid, 'monday-1002', 'opportunities', 'שרה כהן'),
    ('דניאל בן דוד', 'אושר', 560000, 11200, null::uuid, 'monday-1003', 'opportunities', 'דוד לוי'),
    ('רוני מזרחי', 'בוצע ושולם', 310000, 6200, null::uuid, 'monday-1004', 'opportunities', 'דוד לוי')
) as seed(
  client_name,
  status,
  loan_amount,
  expected_commission,
  agent_id,
  monday_item_id,
  source_board,
  referring_agent_text
)
where false;
