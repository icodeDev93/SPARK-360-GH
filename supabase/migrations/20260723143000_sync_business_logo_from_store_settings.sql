create or replace function public.sync_business_logo_from_store_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.businesses
  set
    logo_url = coalesce(new.store_logo, ''),
    updated_at = now()
  where id = new.business_id
    and coalesce(logo_url, '') is distinct from coalesce(new.store_logo, '');

  return new;
end;
$$;

drop trigger if exists sync_store_settings_logo_to_business on public.store_settings;
create trigger sync_store_settings_logo_to_business
after insert or update of store_logo on public.store_settings
for each row execute function public.sync_business_logo_from_store_settings();

update public.businesses b
set
  logo_url = coalesce(s.store_logo, ''),
  updated_at = now()
from public.store_settings s
where s.business_id = b.id
  and s.settings_key = 'default'
  and coalesce(s.store_logo, '') <> ''
  and coalesce(b.logo_url, '') is distinct from coalesce(s.store_logo, '');
