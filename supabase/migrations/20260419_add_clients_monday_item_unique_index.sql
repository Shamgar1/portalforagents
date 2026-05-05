create unique index if not exists clients_monday_item_id_unique
on public.clients (monday_item_id)
where monday_item_id is not null;
