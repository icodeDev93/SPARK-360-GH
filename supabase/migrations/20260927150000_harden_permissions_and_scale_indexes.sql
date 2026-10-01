-- Enforce the same feature permissions at the database boundary that the web UI displays.
-- Role defaults are scoped per business so one owner cannot change another tenant's access.

create table if not exists public.business_role_permissions (
  business_id uuid not null references public.businesses(id) on delete cascade,
  role text not null check (role in ('manager', 'cashier')),
  permissions text[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  primary key (business_id, role)
);

insert into public.business_role_permissions (business_id, role, permissions)
select b.id, rp.role, rp.permissions
from public.businesses b
cross join public.role_permissions rp
where rp.role in ('manager', 'cashier')
on conflict (business_id, role) do nothing;

alter table public.business_role_permissions enable row level security;
alter table public.business_role_permissions force row level security;

drop policy if exists business_role_permissions_select on public.business_role_permissions;
create policy business_role_permissions_select
on public.business_role_permissions for select to authenticated
using (public.can_access_business(business_id));

drop policy if exists business_role_permissions_owner_insert on public.business_role_permissions;
create policy business_role_permissions_owner_insert
on public.business_role_permissions for insert to authenticated
with check (
  public.current_app_role() = 'owner'
  and public.can_access_business(business_id)
  and updated_by = auth.uid()
);

drop policy if exists business_role_permissions_owner_update on public.business_role_permissions;
create policy business_role_permissions_owner_update
on public.business_role_permissions for update to authenticated
using (public.current_app_role() = 'owner' and public.can_access_business(business_id))
with check (
  public.current_app_role() = 'owner'
  and public.can_access_business(business_id)
  and updated_by = auth.uid()
);

drop policy if exists business_role_permissions_owner_delete on public.business_role_permissions;
create policy business_role_permissions_owner_delete
on public.business_role_permissions for delete to authenticated
using (public.current_app_role() = 'owner' and public.can_access_business(business_id));

-- Global defaults are platform configuration and are no longer tenant writable.
drop policy if exists rp_write on public.role_permissions;
drop policy if exists role_permissions_write_owner on public.role_permissions;
create policy role_permissions_write_platform_admin
on public.role_permissions for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create or replace function public.has_business_permission(permission_key text, target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with actor as (
    select role, permission_overrides
    from public.profiles
    where id = auth.uid()
      and coalesce(status, 'Active') = 'Active'
    limit 1
  )
  select
    public.can_access_business(target_business_id)
    and case
      when not exists (select 1 from actor) then false
      when (select role from actor) = 'owner' then true
      when exists (
        select 1
        from jsonb_array_elements_text(coalesce((select permission_overrides from actor)->'revoked', '[]'::jsonb)) p(value)
        where p.value = permission_key
      ) then false
      when exists (
        select 1
        from jsonb_array_elements_text(coalesce((select permission_overrides from actor)->'granted', '[]'::jsonb)) p(value)
        where p.value = permission_key
      ) then true
      else coalesce(
        (
          select permission_key = any(brp.permissions)
          from public.business_role_permissions brp
          where brp.business_id = target_business_id
            and brp.role = (select role from actor)
        ),
        (
          select permission_key = any(rp.permissions)
          from public.role_permissions rp
          where rp.role = (select role from actor)
        ),
        false
      )
    end
$$;

revoke all on function public.has_business_permission(text, uuid) from public;
grant execute on function public.has_business_permission(text, uuid) to authenticated;

do $$
declare
  item record;
  policy_name text;
begin
  for item in
    select * from (values
      ('customers', 'customers'),
      ('suppliers', 'purchases'),
      ('inventory_categories', 'inventory'),
      ('inventory', 'inventory'),
      ('sales', 'pos'),
      ('sale_items', 'pos'),
      ('receipts', 'pos'),
      ('credit_payments', 'credit'),
      ('purchases', 'purchases'),
      ('purchase_items', 'purchases'),
      ('expense_categories', 'expenses'),
      ('expenses', 'expenses'),
      ('banks', 'bank-deposit'),
      ('bank_deposits', 'bank-deposit'),
      ('store_settings', 'settings')
    ) as mapped(table_name, permission_key)
  loop
    if to_regclass(format('public.%I', item.table_name)) is null then
      continue;
    end if;

    for policy_name in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = item.table_name
        and cmd in ('INSERT', 'UPDATE', 'DELETE')
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, item.table_name);
    end loop;

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (business_id is not null and public.has_business_permission(%L, business_id))',
      item.table_name || '_permission_insert', item.table_name, item.permission_key
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (business_id is not null and public.has_business_permission(%L, business_id)) with check (business_id is not null and public.has_business_permission(%L, business_id))',
      item.table_name || '_permission_update', item.table_name, item.permission_key, item.permission_key
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (business_id is not null and public.current_app_role() in (''owner'', ''manager'') and public.has_business_permission(%L, business_id))',
      item.table_name || '_permission_delete', item.table_name, item.permission_key
    );
  end loop;
end $$;

drop policy if exists business_users_manage_owner_manager on public.business_users;
create policy business_users_manage_owner
on public.business_users for all to authenticated
using (
  public.current_app_role() = 'owner'
  and public.can_access_business(business_id)
)
with check (
  public.current_app_role() = 'owner'
  and public.can_access_business(business_id)
  and role in ('manager', 'cashier')
);

create index if not exists idx_customers_business_id on public.customers(business_id);
create index if not exists idx_user_logs_business_created on public.user_logs(business_id, created_at desc);
create index if not exists idx_suppliers_business_id on public.suppliers(business_id);
create index if not exists idx_banks_business_id on public.banks(business_id);
create index if not exists idx_bank_deposits_business_date on public.bank_deposits(business_id, deposit_date desc);
create index if not exists idx_business_role_permissions_business on public.business_role_permissions(business_id);

alter publication supabase_realtime add table public.business_role_permissions;
