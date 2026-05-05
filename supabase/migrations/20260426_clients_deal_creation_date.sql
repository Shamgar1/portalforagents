alter table public.clients
  add column if not exists deal_creation_date date;
