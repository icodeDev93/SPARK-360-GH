-- Tighten public schema RLS for the SPark360 app.
-- This migration intentionally recreates policies for the app tables so older
-- permissive policies cannot linger beside the tightened ones.

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and coalesce(status, 'Active') = 'Active'
  limit 1
$$;

create or replace function public.is_active_app_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('cashier', 'manager', 'admin')
$$;

create or replace function public.is_backoffice_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('manager', 'admin')
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'admin'
$$;

revoke all on function public.current_app_role() from public, anon;
revoke all on function public.is_active_app_user() from public, anon;
revoke all on function public.is_backoffice_user() from public, anon;
revoke all on function public.is_admin_user() from public, anon;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_active_app_user() to authenticated;
grant execute on function public.is_backoffice_user() to authenticated;
grant execute on function public.is_admin_user() to authenticated;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.inventory_categories enable row level security;
alter table public.inventory enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.receipts enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.expenses enable row level security;
alter table public.store_settings enable row level security;

alter table public.profiles force row level security;
alter table public.customers force row level security;
alter table public.suppliers force row level security;
alter table public.inventory_categories force row level security;
alter table public.inventory force row level security;
alter table public.sales force row level security;
alter table public.sale_items force row level security;
alter table public.receipts force row level security;
alter table public.purchases force row level security;
alter table public.purchase_items force row level security;
alter table public.expenses force row level security;
alter table public.store_settings force row level security;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'customers',
        'suppliers',
        'inventory_categories',
        'inventory',
        'sales',
        'sale_items',
        'receipts',
        'purchases',
        'purchase_items',
        'expenses',
        'store_settings'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

create policy profiles_select_self_or_admin
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin_user());

create policy profiles_insert_admin
on public.profiles for insert
to authenticated
with check (public.is_admin_user());

create policy profiles_update_admin
on public.profiles for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy profiles_delete_admin
on public.profiles for delete
to authenticated
using (public.is_admin_user());

create policy customers_select_active_users
on public.customers for select
to authenticated
using (public.is_active_app_user());

create policy customers_insert_active_users
on public.customers for insert
to authenticated
with check (public.is_active_app_user());

create policy customers_update_active_users
on public.customers for update
to authenticated
using (public.is_active_app_user())
with check (public.is_active_app_user());

create policy customers_delete_backoffice
on public.customers for delete
to authenticated
using (public.is_backoffice_user());

create policy inventory_categories_select_active_users
on public.inventory_categories for select
to authenticated
using (public.is_active_app_user());

create policy inventory_categories_manage_backoffice
on public.inventory_categories for all
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

create policy inventory_select_active_users
on public.inventory for select
to authenticated
using (public.is_active_app_user());

create policy inventory_manage_backoffice
on public.inventory for all
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

create policy sales_select_active_users
on public.sales for select
to authenticated
using (public.is_active_app_user());

create policy sales_insert_active_users
on public.sales for insert
to authenticated
with check (public.is_active_app_user());

create policy sales_update_active_users
on public.sales for update
to authenticated
using (public.is_active_app_user())
with check (public.is_active_app_user());

create policy sales_delete_admin
on public.sales for delete
to authenticated
using (public.is_admin_user());

create policy sale_items_select_active_users
on public.sale_items for select
to authenticated
using (public.is_active_app_user());

create policy sale_items_insert_active_users
on public.sale_items for insert
to authenticated
with check (public.is_active_app_user());

create policy sale_items_update_backoffice
on public.sale_items for update
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

create policy sale_items_delete_admin
on public.sale_items for delete
to authenticated
using (public.is_admin_user());

create policy receipts_select_active_users
on public.receipts for select
to authenticated
using (public.is_active_app_user());

create policy receipts_insert_active_users
on public.receipts for insert
to authenticated
with check (public.is_active_app_user());

create policy receipts_update_backoffice
on public.receipts for update
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

create policy receipts_delete_admin
on public.receipts for delete
to authenticated
using (public.is_admin_user());

create policy suppliers_select_backoffice
on public.suppliers for select
to authenticated
using (public.is_backoffice_user());

create policy suppliers_manage_backoffice
on public.suppliers for all
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

create policy purchases_select_backoffice
on public.purchases for select
to authenticated
using (public.is_backoffice_user());

create policy purchases_manage_backoffice
on public.purchases for all
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

create policy purchase_items_select_backoffice
on public.purchase_items for select
to authenticated
using (public.is_backoffice_user());

create policy purchase_items_manage_backoffice
on public.purchase_items for all
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

create policy expenses_select_backoffice
on public.expenses for select
to authenticated
using (public.is_backoffice_user());

create policy expenses_manage_backoffice
on public.expenses for all
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

create policy store_settings_select_active_users
on public.store_settings for select
to authenticated
using (public.is_active_app_user());

create policy store_settings_manage_admin
on public.store_settings for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
