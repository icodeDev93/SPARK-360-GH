alter table public.customers
  drop column if exists company_name;

update public.customers
set phone = btrim(phone)
where phone is not null;

alter table public.customers
  alter column phone set not null;

alter table public.customers
  drop constraint if exists customers_phone_required;

alter table public.customers
  add constraint customers_phone_required check (btrim(phone) <> '');

notify pgrst, 'reload schema';
