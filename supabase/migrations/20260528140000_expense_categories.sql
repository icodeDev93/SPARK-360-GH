create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  sync_device_id text,
  sync_version bigint not null default 1,
  sync_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists expense_categories_business_name_key
  on public.expense_categories(business_id, lower(name));

drop trigger if exists set_expense_categories_updated_at on public.expense_categories;
create trigger set_expense_categories_updated_at
before update on public.expense_categories
for each row execute function public.set_updated_at();

drop trigger if exists bump_expense_categories_sync_version on public.expense_categories;
create trigger bump_expense_categories_sync_version
before update on public.expense_categories
for each row execute function public.bump_sync_version();

alter table public.expense_categories enable row level security;

drop policy if exists expense_categories_select_business on public.expense_categories;
create policy expense_categories_select_business
on public.expense_categories
for select to authenticated
using (business_id is not null and public.can_access_business(business_id));

drop policy if exists expense_categories_insert_business on public.expense_categories;
create policy expense_categories_insert_business
on public.expense_categories
for insert to authenticated
with check (business_id is not null and public.can_access_business(business_id));

drop policy if exists expense_categories_update_business on public.expense_categories;
create policy expense_categories_update_business
on public.expense_categories
for update to authenticated
using (business_id is not null and public.can_access_business(business_id))
with check (business_id is not null and public.can_access_business(business_id));

drop policy if exists expense_categories_delete_business on public.expense_categories;
create policy expense_categories_delete_business
on public.expense_categories
for delete to authenticated
using (
  business_id is not null
  and public.current_app_role() in ('owner', 'manager')
  and public.can_access_business(business_id)
);

insert into public.expense_categories (business_id, name)
select distinct business_id, category
from public.expenses
where business_id is not null and btrim(category) <> ''
on conflict do nothing;
