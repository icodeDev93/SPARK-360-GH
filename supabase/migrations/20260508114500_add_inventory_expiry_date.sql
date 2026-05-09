alter table public.inventory
add column if not exists expiry_date date;

notify pgrst, 'reload schema';
