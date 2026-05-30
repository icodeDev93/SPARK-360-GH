-- Multi-business platform foundation.
-- Owner replaces the previous Administrator role. Each business has one owner,
-- and operational data is scoped by business_id.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) then
    update public.profiles set role = 'owner' where role = 'admin';
  end if;
end $$;

alter table public.profiles
  add column if not exists primary_business_id uuid,
  add column if not exists business_access text not null default 'assigned'
    check (business_access in ('all', 'assigned'));

do $$
begin
  alter table public.profiles drop constraint if exists profiles_role_check;
  alter table public.profiles
    add constraint profiles_role_check check (role in ('owner', 'manager', 'cashier'));
exception
  when others then null;
end $$;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  business_name text not null check (btrim(business_name) <> ''),
  legal_name text,
  phone text,
  email text,
  address text not null default 'Not provided' check (btrim(address) <> ''),
  logo_url text,
  status text not null default 'active' check (status in ('active', 'archived')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_users (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'cashier')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_businesses_updated_at on public.businesses;
create trigger set_businesses_updated_at before update on public.businesses
for each row execute function public.touch_updated_at();

insert into public.businesses (owner_id, business_name, legal_name, phone, email, address)
select
  p.id,
  coalesce((select store_name from public.store_settings where settings_key = 'default' limit 1), 'Bizzy App Business Management System'),
  coalesce((select store_name from public.store_settings where settings_key = 'default' limit 1), 'Bizzy App Business Management System'),
  (select store_phone from public.store_settings where settings_key = 'default' limit 1),
  (select store_email from public.store_settings where settings_key = 'default' limit 1),
  coalesce((select store_address from public.store_settings where settings_key = 'default' limit 1), 'Not provided')
from public.profiles p
where p.role = 'owner'
  and not exists (select 1 from public.businesses)
order by p.created_at nulls last
limit 1;

do $$
declare
  default_business_id uuid;
begin
  select id into default_business_id from public.businesses order by created_at limit 1;

  if default_business_id is not null then
    update public.profiles
    set primary_business_id = coalesce(primary_business_id, default_business_id),
        business_access = case when role in ('owner', 'manager') then 'all' else 'assigned' end;

    insert into public.business_users (business_id, user_id, role)
    select default_business_id, id, role
    from public.profiles
    on conflict (business_id, user_id) do update set role = excluded.role;
  end if;
end $$;

do $$
declare
  table_name text;
  default_business_id uuid;
begin
  select id into default_business_id from public.businesses order by created_at limit 1;

  foreach table_name in array array[
    'customers',
    'suppliers',
    'inventory_categories',
    'inventory',
    'sales',
    'receipts',
    'credit_payments',
    'purchases',
    'expenses',
    'banks',
    'bank_deposits',
    'store_settings',
    'user_logs'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I add column if not exists business_id uuid references public.businesses(id) on delete restrict', table_name);
      if default_business_id is not null then
        execute format('update public.%I set business_id = $1 where business_id is null', table_name) using default_business_id;
      end if;
      execute format('create index if not exists idx_%I_business_id on public.%I(business_id)', table_name, table_name);
    end if;
  end loop;
end $$;

alter table public.sale_items add column if not exists business_id uuid references public.businesses(id) on delete restrict;
update public.sale_items si
set business_id = s.business_id
from public.sales s
where si.sale_id = s.id and si.business_id is null;
create index if not exists idx_sale_items_business_id on public.sale_items(business_id);

alter table public.purchase_items add column if not exists business_id uuid references public.businesses(id) on delete restrict;
update public.purchase_items pi
set business_id = p.business_id
from public.purchases p
where pi.purchase_id = p.id and pi.business_id is null;
create index if not exists idx_purchase_items_business_id on public.purchase_items(business_id);

alter table public.inventory drop constraint if exists inventory_product_code_key;
alter table public.inventory drop constraint if exists inventory_sku_key;
alter table public.inventory drop column if exists sku;
drop trigger if exists set_inventory_codes on public.inventory;
drop function if exists public.set_inventory_codes();

create or replace function public.normalize_manual_product_code()
returns trigger
language plpgsql
as $$
begin
  new.product_code = upper(btrim(new.product_code));
  if coalesce(new.product_code, '') = '' then
    raise exception 'product_code is required';
  end if;
  if tg_op = 'UPDATE' and new.product_code is distinct from old.product_code then
    raise exception 'product_code cannot be changed after creation';
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_manual_product_code on public.inventory;
create trigger normalize_manual_product_code before insert or update on public.inventory
for each row execute function public.normalize_manual_product_code();

create unique index if not exists inventory_business_product_code_key
on public.inventory(business_id, product_code);

alter table public.inventory_categories drop constraint if exists inventory_categories_name_key;

create unique index if not exists inventory_categories_business_name_key
on public.inventory_categories(business_id, lower(name));

alter table public.store_settings drop constraint if exists store_settings_settings_key_key;
create unique index if not exists store_settings_business_key
on public.store_settings(business_id, settings_key);

alter table public.suppliers drop constraint if exists suppliers_supplier_code_key;
create unique index if not exists suppliers_business_supplier_code_key
on public.suppliers(business_id, supplier_code);

alter table public.sales drop constraint if exists sales_invoice_number_key;
alter table public.sales drop constraint if exists sales_receipt_number_key;
create unique index if not exists sales_business_invoice_number_key
on public.sales(business_id, invoice_number);
create unique index if not exists sales_business_receipt_number_key
on public.sales(business_id, receipt_number)
where receipt_number is not null;

alter table public.receipts drop constraint if exists receipts_receipt_number_key;
create unique index if not exists receipts_business_receipt_number_key
on public.receipts(business_id, receipt_number);

alter table public.purchases drop constraint if exists purchases_purchase_number_key;
create unique index if not exists purchases_business_purchase_number_key
on public.purchases(business_id, purchase_number);

create table if not exists public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_number text not null unique default ('TRF-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  source_business_id uuid not null references public.businesses(id) on delete restrict,
  target_business_id uuid not null references public.businesses(id) on delete restrict,
  product_code text not null,
  product_name text not null,
  category_name text,
  quantity integer not null check (quantity > 0),
  status text not null default 'completed' check (status in ('completed', 'reversed')),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_transfers_source_business on public.stock_transfers(source_business_id);
create index if not exists idx_stock_transfers_target_business on public.stock_transfers(target_business_id);

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

create or replace function public.is_owner_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'owner'
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'owner'
$$;

create or replace function public.is_backoffice_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('owner', 'manager')
$$;

create or replace function public.can_access_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    left join public.businesses b on b.owner_id = p.id
    left join public.business_users bu on bu.user_id = p.id and bu.business_id = target_business_id
    where p.id = auth.uid()
      and coalesce(p.status, 'Active') = 'Active'
      and (
        (p.role = 'owner' and b.id = target_business_id)
        or (p.role = 'manager' and p.business_access = 'all' and exists (
          select 1 from public.businesses ob
          join public.business_users obu on obu.business_id = ob.id and obu.user_id = p.id
          where ob.owner_id = (select owner_id from public.businesses where id = target_business_id)
        ))
        or bu.id is not null
      )
  )
$$;

create or replace function public.can_manage_business_records(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.businesses b
    where b.id = target_business_id
      and b.owner_id = auth.uid()
  )
$$;

create or replace function public.transfer_stock(
  source_business uuid,
  target_business uuid,
  source_product_code text,
  transfer_quantity integer,
  transfer_notes text default ''
)
returns public.stock_transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  source_item public.inventory%rowtype;
  target_item public.inventory%rowtype;
  category_id_value uuid;
  new_transfer public.stock_transfers;
  normalized_code text := upper(btrim(source_product_code));
begin
  actor_role := public.current_app_role();
  if actor_role not in ('owner', 'manager') then
    raise exception 'Only owner or manager can transfer stock';
  end if;
  if source_business = target_business then
    raise exception 'Source and receiving businesses must be different';
  end if;
  if transfer_quantity <= 0 then
    raise exception 'Transfer quantity must be greater than zero';
  end if;
  if not public.can_access_business(source_business) or not public.can_access_business(target_business) then
    raise exception 'You do not have access to one or both businesses';
  end if;

  select * into source_item
  from public.inventory
  where business_id = source_business and product_code = normalized_code
  for update;

  if not found then
    raise exception 'Source product was not found';
  end if;
  if source_item.current_stock < transfer_quantity then
    raise exception 'Insufficient stock for transfer';
  end if;

  update public.inventory
  set current_stock = current_stock - transfer_quantity,
      single_quantity = greatest(0, single_quantity - transfer_quantity)
  where id = source_item.id;

  if source_item.category_name is not null and btrim(source_item.category_name) <> '' then
    insert into public.inventory_categories (business_id, name)
    values (target_business, source_item.category_name)
    on conflict do nothing;

    select id into category_id_value
    from public.inventory_categories
    where business_id = target_business and lower(name) = lower(source_item.category_name)
    limit 1;
  end if;

  select * into target_item
  from public.inventory
  where business_id = target_business and product_code = normalized_code
  for update;

  if found then
    update public.inventory
    set current_stock = current_stock + transfer_quantity,
        single_quantity = single_quantity + transfer_quantity,
        product_name = source_item.product_name,
        category_id = coalesce(category_id, category_id_value),
        category_name = coalesce(nullif(category_name, ''), source_item.category_name),
        supplier_name = source_item.supplier_name,
        cost_price = source_item.cost_price,
        selling_price = source_item.selling_price,
        wholesale_cost_price = source_item.wholesale_cost_price,
        single_cost_price = source_item.single_cost_price,
        wholesale_selling_price = source_item.wholesale_selling_price,
        half_selling_price = source_item.half_selling_price,
        quarter_selling_price = source_item.quarter_selling_price,
        single_selling_price = source_item.single_selling_price,
        reorder_level = source_item.reorder_level,
        quantity_per_box = source_item.quantity_per_box,
        stock_limit = source_item.stock_limit,
        expiry_date = source_item.expiry_date,
        description = source_item.description,
        price_levels = source_item.price_levels,
        image_url = source_item.image_url,
        is_active = source_item.is_active
    where id = target_item.id;
  else
    insert into public.inventory (
      business_id, product_code, product_name, category_id, category_name,
      supplier_id, supplier_name, cost_price, selling_price,
      wholesale_cost_price, single_cost_price, wholesale_selling_price,
      half_selling_price, quarter_selling_price, single_selling_price,
      current_stock, reorder_level, wholesale_quantity, single_quantity,
      quantity_per_box, stock_limit, expiry_date, description, price_levels,
      image_url, is_active
    )
    values (
      target_business, source_item.product_code, source_item.product_name, category_id_value, source_item.category_name,
      null, source_item.supplier_name, source_item.cost_price, source_item.selling_price,
      source_item.wholesale_cost_price, source_item.single_cost_price, source_item.wholesale_selling_price,
      source_item.half_selling_price, source_item.quarter_selling_price, source_item.single_selling_price,
      transfer_quantity, source_item.reorder_level, 0, transfer_quantity,
      source_item.quantity_per_box, source_item.stock_limit, source_item.expiry_date, source_item.description, source_item.price_levels,
      source_item.image_url, source_item.is_active
    );
  end if;

  insert into public.stock_transfers (
    source_business_id, target_business_id, product_code, product_name,
    category_name, quantity, notes, created_by
  )
  values (
    source_business, target_business, source_item.product_code, source_item.product_name,
    source_item.category_name, transfer_quantity, transfer_notes, auth.uid()
  )
  returning * into new_transfer;

  return new_transfer;
end;
$$;

create or replace function public.reverse_stock_transfer(transfer_id uuid)
returns public.stock_transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  transfer public.stock_transfers%rowtype;
  source_item public.inventory%rowtype;
  target_item public.inventory%rowtype;
begin
  actor_role := public.current_app_role();
  if actor_role not in ('owner', 'manager') then
    raise exception 'Only owner or manager can reverse stock transfers';
  end if;

  select * into transfer
  from public.stock_transfers
  where id = transfer_id
  for update;

  if not found then
    raise exception 'Transfer was not found';
  end if;
  if transfer.status = 'reversed' then
    raise exception 'Transfer has already been reversed';
  end if;
  if not public.can_access_business(transfer.source_business_id) or not public.can_access_business(transfer.target_business_id) then
    raise exception 'You do not have access to this transfer';
  end if;

  select * into target_item
  from public.inventory
  where business_id = transfer.target_business_id and product_code = transfer.product_code
  for update;

  if not found or target_item.current_stock < transfer.quantity then
    raise exception 'Receiving business does not have enough stock to reverse this transfer';
  end if;

  select * into source_item
  from public.inventory
  where business_id = transfer.source_business_id and product_code = transfer.product_code
  for update;

  if not found then
    raise exception 'Source product was not found';
  end if;

  update public.inventory
  set current_stock = current_stock - transfer.quantity,
      single_quantity = greatest(0, single_quantity - transfer.quantity)
  where id = target_item.id;

  update public.inventory
  set current_stock = current_stock + transfer.quantity,
      single_quantity = single_quantity + transfer.quantity
  where id = source_item.id;

  update public.stock_transfers
  set status = 'reversed',
      reversed_at = now(),
      reversed_by = auth.uid()
  where id = transfer.id
  returning * into transfer;

  return transfer;
end;
$$;

grant execute on function public.transfer_stock(uuid, uuid, text, integer, text) to authenticated;
grant execute on function public.reverse_stock_transfer(uuid) to authenticated;

alter table public.businesses enable row level security;
alter table public.business_users enable row level security;
alter table public.stock_transfers enable row level security;

drop policy if exists businesses_select_accessible on public.businesses;
create policy businesses_select_accessible
on public.businesses for select
to authenticated
using (public.can_access_business(id));

drop policy if exists businesses_insert_owner on public.businesses;
create policy businesses_insert_owner
on public.businesses for insert
to authenticated
with check (owner_id = auth.uid() and public.current_app_role() = 'owner');

drop policy if exists businesses_update_owner on public.businesses;
create policy businesses_update_owner
on public.businesses for update
to authenticated
using (public.can_manage_business_records(id))
with check (public.can_manage_business_records(id));

drop policy if exists business_users_select_accessible on public.business_users;
create policy business_users_select_accessible
on public.business_users for select
to authenticated
using (public.can_access_business(business_id));

drop policy if exists business_users_manage_owner_manager on public.business_users;
create policy business_users_manage_owner_manager
on public.business_users for all
to authenticated
using (public.current_app_role() in ('owner', 'manager') and public.can_access_business(business_id))
with check (public.current_app_role() in ('owner', 'manager') and public.can_access_business(business_id));

drop policy if exists stock_transfers_select_accessible on public.stock_transfers;
create policy stock_transfers_select_accessible
on public.stock_transfers for select
to authenticated
using (public.can_access_business(source_business_id) or public.can_access_business(target_business_id));

drop policy if exists stock_transfers_insert_backoffice on public.stock_transfers;
create policy stock_transfers_insert_backoffice
on public.stock_transfers for insert
to authenticated
with check (public.current_app_role() in ('owner', 'manager') and public.can_access_business(source_business_id) and public.can_access_business(target_business_id));

drop policy if exists stock_transfers_update_backoffice on public.stock_transfers;
create policy stock_transfers_update_backoffice
on public.stock_transfers for update
to authenticated
using (public.current_app_role() in ('owner', 'manager') and public.can_access_business(source_business_id) and public.can_access_business(target_business_id))
with check (public.current_app_role() in ('owner', 'manager') and public.can_access_business(source_business_id) and public.can_access_business(target_business_id));

update public.role_permissions set role = 'owner' where role = 'admin';
update public.role_permissions
set permissions = array(
  select distinct permission
  from unnest(permissions || array['stock-transfer']) as permission
)
where role = 'manager';

drop policy if exists "rp_write" on public.role_permissions;
create policy "rp_write" on public.role_permissions
  for all to authenticated
  using (public.current_app_role() = 'owner')
  with check (public.current_app_role() = 'owner');

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'customers',
    'suppliers',
    'inventory_categories',
    'inventory',
    'sales',
    'sale_items',
    'receipts',
    'credit_payments',
    'purchases',
    'purchase_items',
    'expenses',
    'banks',
    'bank_deposits',
    'store_settings',
    'user_logs'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      for policy_name in
        select policyname from pg_policies where schemaname = 'public' and tablename = table_name
      loop
        execute format('drop policy if exists %I on public.%I', policy_name, table_name);
      end loop;

      execute format('alter table public.%I enable row level security', table_name);
      execute format('alter table public.%I force row level security', table_name);

      execute format(
        'create policy %I on public.%I for select to authenticated using (business_id is not null and public.can_access_business(business_id))',
        table_name || '_business_select',
        table_name
      );
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (business_id is not null and public.can_access_business(business_id))',
        table_name || '_business_insert',
        table_name
      );
      execute format(
        'create policy %I on public.%I for update to authenticated using (business_id is not null and public.can_access_business(business_id)) with check (business_id is not null and public.can_access_business(business_id))',
        table_name || '_business_update',
        table_name
      );
      execute format(
        'create policy %I on public.%I for delete to authenticated using (business_id is not null and public.current_app_role() in (''owner'', ''manager'') and public.can_access_business(business_id))',
        table_name || '_business_delete',
        table_name
      );
    end if;
  end loop;
end $$;

drop policy if exists profiles_select_self_or_owner_manager on public.profiles;
drop policy if exists profiles_select_self_or_admin on public.profiles;
drop policy if exists profiles_insert_admin on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_delete_admin on public.profiles;

create policy profiles_select_self_or_owner_manager
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.current_app_role() in ('owner', 'manager')
);

create policy profiles_update_owner_manager
on public.profiles for update
to authenticated
using (public.current_app_role() in ('owner', 'manager'))
with check (public.current_app_role() in ('owner', 'manager'));

create policy profiles_delete_owner_manager
on public.profiles for delete
to authenticated
using (public.current_app_role() in ('owner', 'manager'));
