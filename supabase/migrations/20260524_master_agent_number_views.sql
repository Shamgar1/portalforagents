do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.user_role'::regtype
      and enumlabel = 'master'
  ) then
    alter type public.user_role add value 'master';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.user_role'::regtype
      and enumlabel = 'agent_number'
  ) then
    alter type public.user_role add value 'agent_number';
  end if;
end
$$;

alter table public.profiles
  add column if not exists agent_number text;

alter table public.clients
  add column if not exists agent_number text,
  add column if not exists payment_to_agent_number numeric(12, 2) not null default 0;

create index if not exists clients_agent_number_idx on public.clients(agent_number);

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

create or replace function public.current_user_agent_number()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select agent_number from public.profiles where id = auth.uid()
$$;

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
