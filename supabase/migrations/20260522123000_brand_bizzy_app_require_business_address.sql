-- Brand rename and required business address for the multi-business flow.

alter table public.businesses
  drop constraint if exists businesses_address_required;

update public.businesses
set address = 'Not provided'
where address is null or btrim(address) = '';

alter table public.businesses
  alter column address set not null,
  add constraint businesses_address_required check (btrim(address) <> '');

update public.store_settings
set store_name = 'Bizzy App Business Management System'
where store_name is not null;

notify pgrst, 'reload schema';
