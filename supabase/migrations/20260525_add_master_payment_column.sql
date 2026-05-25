alter table public.clients
add column if not exists master_payment numeric(12,2) default 0;

notify pgrst, 'reload schema';
