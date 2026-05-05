alter table public.clients
  add column if not exists deal_created_at date;

update public.clients
set deal_created_at = deal_creation_date
where deal_created_at is null
  and deal_creation_date is not null;
