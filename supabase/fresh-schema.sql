-- =====================================================
-- Bizzy App Business Management System fresh Supabase schema
-- Final architecture: multi-business, Owner/Manager/Cashier,
-- manual product codes, credit invoices/payments, offline sync,
-- and stock transfer support.
--
-- Run on a new Supabase project after creating auth users.
-- Owner accounts are manually created in Supabase Auth, then a
-- matching public.profiles row is inserted with role = 'owner'.
-- =====================================================

create extension if not exists pgcrypto;

-- ---------- shared helpers ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.bump_sync_version()
returns trigger
language plpgsql
as $$
begin
  new.sync_version = coalesce(old.sync_version, 0) + 1;
  return new;
end;
$$;

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

create or replace function public.enforce_inventory_pack_calculations()
returns trigger
language plpgsql
as $$
begin
  new.wholesale_quantity = greatest(coalesce(new.wholesale_quantity, 0), 0);
  new.single_quantity = greatest(coalesce(new.single_quantity, 0), 0);
  new.quantity_per_box = greatest(coalesce(new.quantity_per_box, 0), 0);
  new.stock_limit = greatest(coalesce(new.stock_limit, 0), 0);
  new.wholesale_cost_price = greatest(coalesce(new.wholesale_cost_price, 0), 0);
  new.single_cost_price = greatest(coalesce(new.single_cost_price, 0), 0);
  new.wholesale_selling_price = greatest(coalesce(new.wholesale_selling_price, 0), 0);
  new.single_selling_price = greatest(coalesce(new.single_selling_price, 0), 0);

  new.half_selling_price = round(new.wholesale_selling_price / 2, 2);
  new.quarter_selling_price = round(new.wholesale_selling_price / 4, 2);
  new.current_stock = case
    when new.quantity_per_box > 0 then floor(new.wholesale_quantity * new.quantity_per_box + new.single_quantity)::integer
    else floor(new.single_quantity)::integer
  end;
  new.cost_price = new.wholesale_cost_price;
  new.selling_price = coalesce(nullif(new.single_selling_price, 0), new.wholesale_selling_price, 0);
  new.reorder_level = new.stock_limit;

  return new;
end;
$$;

create sequence if not exists public.supplier_code_seq;
create or replace function public.set_supplier_code()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.supplier_code, '') = '' then
    new.supplier_code = 'sup' || lpad(nextval('public.supplier_code_seq')::text, 3, '0');
  end if;
  return new;
end;
$$;

create sequence if not exists public.purchase_number_seq;
create or replace function public.set_purchase_number()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.purchase_number, '') = '' then
    new.purchase_number = 'PO-' || lpad(nextval('public.purchase_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create or replace function public.set_created_by_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_name text;
begin
  select name into profile_name from public.profiles where id = auth.uid() limit 1;
  if coalesce(new.created_by, '') = '' then
    new.created_by = coalesce(profile_name, 'Unknown User');
  end if;
  return new;
end;
$$;

create or replace function public.initials_from_name(next_name text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      upper(
        left(split_part(btrim(next_name), ' ', 1), 1) ||
        left(split_part(btrim(next_name), ' ', 2), 1)
      ),
      ''
    ),
    'OW'
  )
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_name text;
  next_role text;
  next_phone text;
  next_address text;
begin
  next_name := coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1), 'Owner');
  next_role := coalesce(nullif(btrim(new.raw_user_meta_data->>'role'), ''), 'owner');
  next_phone := nullif(btrim(new.raw_user_meta_data->>'phone'), '');
  next_address := nullif(btrim(new.raw_user_meta_data->>'address'), '');

  if next_role not in ('owner', 'manager', 'cashier') then
    next_role := 'owner';
  end if;

  insert into public.profiles (
    id,
    name,
    email,
    role,
    initials,
    avatar_color,
    status,
    permission_overrides,
    phone,
    address,
    business_access
  )
  values (
    new.id,
    next_name,
    lower(new.email),
    next_role,
    public.initials_from_name(next_name),
    case
      when next_role = 'manager' then 'bg-emerald-600'
      when next_role = 'cashier' then 'bg-amber-600'
      else 'bg-indigo-600'
    end,
    'Active',
    '{"granted":[],"revoked":[]}'::jsonb,
    next_phone,
    next_address,
    case when next_role = 'cashier' then 'assigned' else 'all' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ---------- identity ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  email text not null unique,
  role text not null check (role in ('owner', 'manager', 'cashier')),
  initials text not null default '',
  avatar_color text not null default 'bg-indigo-600',
  avatar_url text,
  phone text,
  address text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  permission_overrides jsonb not null default '{"granted":[],"revoked":[]}'::jsonb,
  primary_business_id uuid,
  business_access text not null default 'assigned' check (business_access in ('all', 'assigned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  business_name text not null check (btrim(business_name) <> ''),
  legal_name text,
  phone text,
  email text,
  address text not null check (btrim(address) <> ''),
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

alter table public.profiles
  add constraint profiles_primary_business_id_fkey
  foreign key (primary_business_id) references public.businesses(id) on delete set null;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- ---------- operations ----------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  full_name text not null check (btrim(full_name) <> ''),
  phone text not null check (btrim(phone) <> ''),
  address text,
  remarks text,
  debt_limit numeric(12,2) not null default 0 check (debt_limit >= 0),
  visiting_day text not null default 'Sunday'
    check (visiting_day in ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  outstanding_balance numeric(12,2) not null default 0,
  status text not null default 'Active' check (status in ('Active', 'Inactive', 'Blocked')),
  sync_device_id text,
  sync_version bigint not null default 1,
  sync_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  supplier_code text not null,
  name text not null check (btrim(name) <> ''),
  contact_name text,
  phone text,
  email text,
  address text,
  category text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  joined_date date,
  notes text,
  sync_device_id text,
  sync_version bigint not null default 1,
  sync_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, supplier_code)
);

create table if not exists public.inventory_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  sync_device_id text,
  sync_version bigint not null default 1,
  sync_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists inventory_categories_business_name_key
  on public.inventory_categories(business_id, lower(name));

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  product_code text not null,
  product_name text not null check (btrim(product_name) <> ''),
  category_id uuid references public.inventory_categories(id) on delete set null,
  category_name text,
  supplier_id uuid references public.suppliers(id) on delete set null,
  supplier_name text,
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  selling_price numeric(12,2) not null default 0 check (selling_price >= 0),
  wholesale_cost_price numeric(12,2) not null default 0 check (wholesale_cost_price >= 0),
  single_cost_price numeric(12,2) not null default 0 check (single_cost_price >= 0),
  wholesale_selling_price numeric(12,2) not null default 0 check (wholesale_selling_price >= 0),
  half_selling_price numeric(12,2) not null default 0 check (half_selling_price >= 0),
  quarter_selling_price numeric(12,2) not null default 0 check (quarter_selling_price >= 0),
  single_selling_price numeric(12,2) not null default 0 check (single_selling_price >= 0),
  current_stock integer not null default 0 check (current_stock >= 0),
  reorder_level integer not null default 0 check (reorder_level >= 0),
  wholesale_quantity numeric(12,2) not null default 0 check (wholesale_quantity >= 0),
  single_quantity integer not null default 0 check (single_quantity >= 0),
  quantity_per_box integer not null default 0 check (quantity_per_box >= 0),
  stock_limit integer not null default 0 check (stock_limit >= 0),
  expiry_date date,
  description text not null default '',
  price_levels jsonb not null default '[]'::jsonb,
  image_url text,
  is_active boolean not null default true,
  sync_device_id text,
  sync_version bigint not null default 1,
  sync_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, product_code)
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  invoice_number text not null,
  receipt_number text,
  sale_date date not null default current_date,
  sale_time timestamptz not null default now(),
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null default 'Walk-in Customer',
  items text not null default '',
  subtotal numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  total_cost numeric(12,2) not null default 0,
  gross_margin numeric(12,2) not null default 0,
  payment_method text not null check (payment_method in ('Cash', 'MoMo', 'Cheque', 'Bank Transfer', 'Credit')),
  status text not null default 'completed' check (status in ('completed', 'refunded', 'voided', 'credit')),
  cashier text,
  notes text,
  sync_device_id text,
  sync_version bigint not null default 1,
  sync_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, invoice_number)
);
create unique index if not exists sales_business_receipt_number_key
  on public.sales(business_id, receipt_number) where receipt_number is not null;

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  sale_id uuid not null references public.sales(id) on delete cascade,
  inventory_id uuid references public.inventory(id) on delete set null,
  product_code text not null,
  product_name text not null,
  quantity integer not null default 1 check (quantity >= 0),
  returned_quantity integer not null default 0 check (returned_quantity >= 0),
  net_quantity integer generated always as (quantity - returned_quantity) stored,
  price_level text not null default 'Single' check (price_level in ('Single', 'Quarter', 'Half', 'Wholesale')),
  stock_units_deducted integer not null default 0 check (stock_units_deducted >= 0),
  unit_price numeric(12,2) not null default 0,
  unit_cost numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  line_cost numeric(12,2) not null default 0,
  line_margin numeric(12,2) not null default 0,
  sync_device_id text,
  sync_version bigint not null default 1,
  sync_deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  sale_id uuid not null references public.sales(id) on delete cascade,
  receipt_number text not null,
  issued_at timestamptz not null default now(),
  customer_name text,
  cashier text,
  subtotal numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  payment_method text,
  receipt_payload jsonb not null default '{}'::jsonb,
  sync_device_id text,
  sync_version bigint not null default 1,
  sync_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, receipt_number)
);

create or replace function public.apply_sale_item_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  units_per_qty numeric;
  restored_units integer;
begin
  if tg_op = 'INSERT' then
    if new.stock_units_deducted <= 0 then
      new.stock_units_deducted = new.quantity;
    end if;

    update public.inventory
    set current_stock = greatest(0, current_stock - new.stock_units_deducted),
        wholesale_quantity = case
          when quantity_per_box > 0 then floor(greatest(0, current_stock - new.stock_units_deducted)::numeric / quantity_per_box)::integer
          else 0
        end,
        single_quantity = case
          when quantity_per_box > 0 then mod(greatest(0, current_stock - new.stock_units_deducted), quantity_per_box)
          else greatest(0, current_stock - new.stock_units_deducted)
        end,
        updated_at = now()
    where business_id = new.business_id
      and product_code = new.product_code;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.returned_quantity > old.returned_quantity then
      units_per_qty := case when old.quantity > 0 then old.stock_units_deducted::numeric / old.quantity else 1 end;
      restored_units := greatest(0, round((new.returned_quantity - old.returned_quantity) * units_per_qty)::integer);

      update public.inventory
      set current_stock = current_stock + restored_units,
          wholesale_quantity = case
            when quantity_per_box > 0 then floor((current_stock + restored_units)::numeric / quantity_per_box)::integer
            else 0
          end,
          single_quantity = case
            when quantity_per_box > 0 then mod(current_stock + restored_units, quantity_per_box)
            else current_stock + restored_units
          end,
          updated_at = now()
      where business_id = new.business_id
        and product_code = new.product_code;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    units_per_qty := case when old.quantity > 0 then old.stock_units_deducted::numeric / old.quantity else 1 end;
    restored_units := greatest(0, round((old.quantity - old.returned_quantity) * units_per_qty)::integer);

    update public.inventory
    set current_stock = current_stock + restored_units,
        wholesale_quantity = case
          when quantity_per_box > 0 then floor((current_stock + restored_units)::numeric / quantity_per_box)::integer
          else 0
        end,
        single_quantity = case
          when quantity_per_box > 0 then mod(current_stock + restored_units, quantity_per_box)
          else current_stock + restored_units
        end,
        updated_at = now()
    where business_id = old.business_id
      and product_code = old.product_code;

    return old;
  end if;

  return null;
end;
$$;

create table if not exists public.credit_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete cascade,
  sale_id text,
  invoice_number text,
  receipt_id uuid references public.receipts(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('Cash', 'MoMo', 'Cheque', 'Bank Transfer')),
  notes text default '',
  sync_device_id text,
  sync_version bigint not null default 1,
  sync_deleted_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  purchase_number text not null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  supplier_code text,
  supplier_name text not null,
  purchase_date date not null default current_date,
  expected_date date,
  item_count integer not null default 0 check (item_count >= 0),
  subtotal numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  status text not null default 'Pending' check (status in ('Pending', 'Received', 'Partial', 'Cancelled')),
  payment_status text not null default 'Unpaid' check (payment_status in ('Unpaid', 'Paid', 'Partial', 'Refunded')),
  notes text,
  sync_device_id text,
  sync_version bigint not null default 1,
  sync_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, purchase_number)
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  inventory_id uuid references public.inventory(id) on delete set null,
  product_code text,
  product_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_cost numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  sync_device_id text,
  sync_version bigint not null default 1,
  sync_deleted_at timestamptz,
  created_at timestamptz not null default now()
);

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

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  expense_date date not null default current_date,
  category text not null,
  description text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  paid_by text not null default 'Cash' check (paid_by in ('Cash', 'MoMo', 'Cheque', 'Bank Transfer')),
  notes text,
  proof_url text,
  created_by text not null default '',
  sync_device_id text,
  sync_version bigint not null default 1,
  sync_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.banks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  bank_name text not null check (btrim(bank_name) <> ''),
  branch text not null check (btrim(branch) <> ''),
  address text not null check (btrim(address) <> ''),
  telephone text not null check (btrim(telephone) <> ''),
  created_by text not null default '',
  sync_device_id text,
  sync_version bigint not null default 1,
  sync_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, bank_name, branch)
);

create table if not exists public.bank_deposits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  deposit_date date not null default current_date,
  bank_id uuid references public.banks(id) on delete set null,
  bank_name text not null check (btrim(bank_name) <> ''),
  account_no text not null check (btrim(account_no) <> ''),
  amount numeric(12,2) not null default 0 check (amount > 0),
  remarks text,
  created_by text not null default '',
  sync_device_id text,
  sync_version bigint not null default 1,
  sync_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  settings_key text not null default 'default',
  store_name text not null default 'Bizzy App Business Management System',
  store_address text,
  store_phone text,
  store_email text,
  store_logo text,
  currency text not null default 'GHS',
  currency_symbol text not null default '₵',
  tax_rate numeric(5,2) not null default 10,
  tax_label text not null default 'VAT',
  tax_enabled boolean not null default true,
  receipt_footer text,
  receipt_show_logo boolean not null default true,
  receipt_show_tax boolean not null default true,
  receipt_show_barcode boolean not null default true,
  receipt_theme text not null default 'minimal' check (receipt_theme in ('minimal', 'classic', 'modern')),
  timezone text not null default 'Africa/Accra',
  sync_device_id text,
  sync_version bigint not null default 1,
  sync_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, settings_key)
);

create table if not exists public.user_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  user_name text not null,
  user_role text not null,
  category text not null,
  action text not null,
  description text not null,
  changes jsonb,
  sync_device_id text,
  sync_version bigint not null default 1,
  sync_deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role text primary key check (role in ('manager', 'cashier')),
  permissions text[] not null default '{}',
  updated_at timestamptz not null default now()
);

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

-- ---------- indexes ----------
create index if not exists idx_businesses_owner_id on public.businesses(owner_id);
create index if not exists idx_business_users_business_id on public.business_users(business_id);
create index if not exists idx_business_users_user_id on public.business_users(user_id);
create index if not exists idx_inventory_business_id on public.inventory(business_id);
create index if not exists idx_inventory_category_id on public.inventory(category_id);
create index if not exists idx_sales_business_date on public.sales(business_id, sale_date desc);
create index if not exists idx_sales_customer_id on public.sales(customer_id);
create index if not exists idx_sale_items_sale_id on public.sale_items(sale_id);
create index if not exists idx_receipts_sale_id on public.receipts(sale_id);
create index if not exists idx_credit_payments_invoice_number on public.credit_payments(business_id, invoice_number);
create index if not exists idx_purchases_business_date on public.purchases(business_id, purchase_date desc);
create index if not exists idx_expenses_business_date on public.expenses(business_id, expense_date desc);
create index if not exists idx_stock_transfers_source_business on public.stock_transfers(source_business_id);
create index if not exists idx_stock_transfers_target_business on public.stock_transfers(target_business_id);

-- ---------- triggers ----------
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles','businesses','customers','suppliers','inventory_categories','inventory',
    'sales','purchases','expense_categories','expenses','banks','bank_deposits','store_settings'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;

  foreach table_name in array array[
    'customers','suppliers','inventory_categories','inventory','sales','sale_items',
    'receipts','credit_payments','purchases','purchase_items','expense_categories','expenses','banks',
    'bank_deposits','store_settings'
  ]
  loop
    execute format('drop trigger if exists bump_%I_sync_version on public.%I', table_name, table_name);
    execute format('create trigger bump_%I_sync_version before update on public.%I for each row execute function public.bump_sync_version()', table_name, table_name);
  end loop;
end $$;

drop trigger if exists normalize_manual_product_code on public.inventory;
create trigger normalize_manual_product_code before insert or update on public.inventory
for each row execute function public.normalize_manual_product_code();

drop trigger if exists enforce_inventory_pack_calculations_insert on public.inventory;
create trigger enforce_inventory_pack_calculations_insert
before insert on public.inventory
for each row execute function public.enforce_inventory_pack_calculations();

drop trigger if exists enforce_inventory_pack_calculations_update on public.inventory;
create trigger enforce_inventory_pack_calculations_update
before update of
  wholesale_quantity,
  single_quantity,
  quantity_per_box,
  stock_limit,
  wholesale_cost_price,
  single_cost_price,
  wholesale_selling_price,
  single_selling_price
on public.inventory
for each row execute function public.enforce_inventory_pack_calculations();

drop trigger if exists ensure_owner_business_user on public.businesses;
create trigger ensure_owner_business_user
after insert or update of owner_id on public.businesses
for each row execute function public.ensure_owner_business_user();

drop trigger if exists set_supplier_code on public.suppliers;
create trigger set_supplier_code before insert on public.suppliers
for each row execute function public.set_supplier_code();

drop trigger if exists set_purchase_number on public.purchases;
create trigger set_purchase_number before insert on public.purchases
for each row execute function public.set_purchase_number();

drop trigger if exists set_expense_created_by on public.expenses;
create trigger set_expense_created_by before insert on public.expenses
for each row execute function public.set_created_by_name();

drop trigger if exists set_bank_created_by on public.banks;
create trigger set_bank_created_by before insert on public.banks
for each row execute function public.set_created_by_name();

drop trigger if exists set_bank_deposit_created_by on public.bank_deposits;
create trigger set_bank_deposit_created_by before insert on public.bank_deposits
for each row execute function public.set_created_by_name();

drop trigger if exists sale_items_apply_stock_insert on public.sale_items;
create trigger sale_items_apply_stock_insert
before insert on public.sale_items
for each row execute function public.apply_sale_item_stock();

drop trigger if exists sale_items_apply_stock_update on public.sale_items;
create trigger sale_items_apply_stock_update
after update of returned_quantity on public.sale_items
for each row execute function public.apply_sale_item_stock();

drop trigger if exists sale_items_apply_stock_delete on public.sale_items;
create trigger sale_items_apply_stock_delete
after delete on public.sale_items
for each row execute function public.apply_sale_item_stock();

-- ---------- auth/RLS helpers ----------
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles
  where id = auth.uid() and coalesce(status, 'Active') = 'Active'
  limit 1
$$;

create or replace function public.is_owner_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.current_app_role() = 'owner' $$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.current_app_role() = 'owner' $$;

create or replace function public.is_backoffice_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.current_app_role() in ('owner', 'manager') $$;

create or replace function public.is_active_app_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.current_app_role() in ('owner', 'manager', 'cashier') $$;

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
          select 1
          from public.businesses ob
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
    where b.id = target_business_id and b.owner_id = auth.uid()
  )
$$;

create or replace function public.ensure_owner_business_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null then
    insert into public.business_users (business_id, user_id, role)
    values (new.id, new.owner_id, 'owner')
    on conflict (business_id, user_id) do update set role = 'owner';
  end if;
  return new;
end;
$$;

create or replace function public.get_accessible_businesses()
returns table (
  id uuid,
  owner_id uuid,
  business_name text,
  legal_name text,
  phone text,
  email text,
  address text,
  logo_url text,
  status text,
  archived_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with actor as (
    select id, role, business_access
    from public.profiles
    where id = auth.uid()
      and coalesce(status, 'Active') = 'Active'
    limit 1
  ),
  actor_owner_scope as (
    select distinct b.owner_id
    from public.businesses b
    join public.business_users bu on bu.business_id = b.id
    join actor a on a.id = bu.user_id
  )
  select
    b.id,
    b.owner_id,
    b.business_name,
    b.legal_name,
    b.phone,
    b.email,
    b.address,
    b.logo_url,
    b.status,
    b.archived_at,
    b.created_at
  from public.businesses b
  join actor a on true
  left join public.business_users bu
    on bu.business_id = b.id
    and bu.user_id = a.id
  where b.status = 'active'
    and (
      (a.role = 'owner' and b.owner_id = a.id)
      or (a.role = 'manager' and a.business_access = 'all' and b.owner_id in (select owner_id from actor_owner_scope))
      or bu.id is not null
    )
  order by b.business_name;
$$;

create or replace function public.can_access_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with actor as (
    select id, role
    from public.profiles
    where id = auth.uid()
      and coalesce(status, 'Active') = 'Active'
    limit 1
  ),
  actor_businesses as (
    select b.id, b.owner_id
    from public.businesses b
    left join public.business_users bu
      on bu.business_id = b.id
      and bu.user_id = (select id from actor)
    where b.status = 'active'
      and (
        (select role from actor) = 'owner' and b.owner_id = (select id from actor)
        or (select role from actor) = 'manager' and bu.id is not null
      )
  )
  select exists (
    select 1
    from actor
    where target_profile_id = actor.id
  )
  or exists (
    select 1
    from public.business_users target_bu
    join actor_businesses ab on ab.id = target_bu.business_id
    where target_bu.user_id = target_profile_id
  )
$$;

create or replace function public.can_manage_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles actor
    join public.profiles target on target.id = target_profile_id
    where actor.id = auth.uid()
      and coalesce(actor.status, 'Active') = 'Active'
      and actor.role in ('owner', 'manager')
      and target.id <> actor.id
      and public.can_access_profile(target.id)
      and (
        actor.role = 'owner'
        or (actor.role = 'manager' and target.role <> 'owner')
      )
  )
$$;

create or replace function public.has_app_permission(permission_key text)
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
  select case
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
    else exists (
      select 1
      from public.role_permissions rp
      where rp.role = (select role from actor)
        and permission_key = any(rp.permissions)
    )
  end
$$;

create or replace function public.update_own_profile_avatar(next_avatar_url text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  update public.profiles
  set avatar_url = nullif(btrim(next_avatar_url), ''), updated_at = now()
  where id = auth.uid()
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found for current user';
  end if;

  return updated_profile;
end;
$$;

-- ---------- stock transfer RPCs ----------
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

  if not found then raise exception 'Source product was not found'; end if;
  if source_item.current_stock < transfer_quantity then raise exception 'Insufficient stock for transfer'; end if;

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

  select * into transfer from public.stock_transfers where id = transfer_id for update;
  if not found then raise exception 'Transfer was not found'; end if;
  if transfer.status = 'reversed' then raise exception 'Transfer has already been reversed'; end if;
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
  if not found then raise exception 'Source product was not found'; end if;

  update public.inventory
  set current_stock = current_stock - transfer.quantity,
      single_quantity = greatest(0, single_quantity - transfer.quantity)
  where id = target_item.id;

  update public.inventory
  set current_stock = current_stock + transfer.quantity,
      single_quantity = single_quantity + transfer.quantity
  where id = source_item.id;

  update public.stock_transfers
  set status = 'reversed', reversed_at = now(), reversed_by = auth.uid()
  where id = transfer.id
  returning * into transfer;

  return transfer;
end;
$$;

-- ---------- grants ----------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_active_app_user() to authenticated;
grant execute on function public.is_backoffice_user() to authenticated;
grant execute on function public.is_owner_user() to authenticated;
grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.can_access_business(uuid) to authenticated;
grant execute on function public.get_accessible_businesses() to authenticated;
grant execute on function public.transfer_stock(uuid, uuid, text, integer, text) to authenticated;
grant execute on function public.reverse_stock_transfer(uuid) to authenticated;
grant execute on function public.update_own_profile_avatar(text) to authenticated;

-- ---------- RLS ----------
do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'profiles','businesses','business_users','customers','suppliers','inventory_categories','expense_categories',
    'inventory','sales','sale_items','receipts','credit_payments','purchases','purchase_items',
    'expenses','banks','bank_deposits','store_settings','user_logs','role_permissions','stock_transfers'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    for policy_name in
      select policyname from pg_policies where schemaname = 'public' and tablename = table_name
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    end loop;
  end loop;
end $$;

create policy profiles_select_self_or_owner_manager
on public.profiles for select to authenticated
using (public.can_access_profile(id));

create policy profiles_update_owner_manager
on public.profiles for update to authenticated
using (public.can_manage_profile(id))
with check (public.can_manage_profile(id));

create policy profiles_delete_owner_manager
on public.profiles for delete to authenticated
using (public.can_manage_profile(id));

create policy businesses_select_accessible
on public.businesses for select to authenticated
using (public.can_access_business(id));

create policy businesses_insert_owner
on public.businesses for insert to authenticated
with check (owner_id = auth.uid() and public.current_app_role() = 'owner');

create policy businesses_update_owner
on public.businesses for update to authenticated
using (public.can_manage_business_records(id))
with check (public.can_manage_business_records(id));

create policy business_users_select_accessible
on public.business_users for select to authenticated
using (public.can_access_business(business_id));

create policy business_users_manage_owner_manager
on public.business_users for all to authenticated
using (public.current_app_role() in ('owner', 'manager') and public.can_access_business(business_id))
with check (public.current_app_role() in ('owner', 'manager') and public.can_access_business(business_id));

create policy role_permissions_read
on public.role_permissions for select to authenticated
using (true);

create policy role_permissions_write_owner
on public.role_permissions for all to authenticated
using (public.current_app_role() = 'owner')
with check (public.current_app_role() = 'owner');

create policy stock_transfers_select_accessible
on public.stock_transfers for select to authenticated
using (public.can_access_business(source_business_id) or public.can_access_business(target_business_id));

create policy stock_transfers_insert_backoffice
on public.stock_transfers for insert to authenticated
with check (
  public.current_app_role() in ('owner', 'manager')
  and public.can_access_business(source_business_id)
  and public.can_access_business(target_business_id)
);

create policy stock_transfers_update_backoffice
on public.stock_transfers for update to authenticated
using (
  public.current_app_role() in ('owner', 'manager')
  and public.can_access_business(source_business_id)
  and public.can_access_business(target_business_id)
)
with check (
  public.current_app_role() in ('owner', 'manager')
  and public.can_access_business(source_business_id)
  and public.can_access_business(target_business_id)
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customers','suppliers','inventory_categories','expense_categories','inventory','sales','sale_items',
    'receipts','credit_payments','purchases','purchase_items','expenses','banks',
    'bank_deposits','store_settings'
  ]
  loop
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
  end loop;
end $$;

create policy user_logs_business_select
on public.user_logs for select to authenticated
using (
  business_id is not null
  and public.can_access_business(business_id)
  and (
    public.current_app_role() = 'owner'
    or public.has_app_permission('logs')
  )
);

create policy user_logs_business_insert
on public.user_logs for insert to authenticated
with check (
  business_id is not null
  and public.can_access_business(business_id)
);

create policy user_logs_owner_delete
on public.user_logs for delete to authenticated
using (
  business_id is not null
  and public.current_app_role() = 'owner'
  and public.can_manage_business_records(business_id)
);

-- ---------- seed role permissions and categories ----------
insert into public.role_permissions (role, permissions) values
  ('manager', array['dashboard','pos','sales-history','customers','credit','purchases','inventory','expenses','bank-deposit','stock-transfer','reports']),
  ('cashier', array['pos','sales-history','customers','credit'])
on conflict (role) do update set permissions = excluded.permissions, updated_at = now();

-- ---------- storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png']),
  ('profile-images', 'profile-images', true, 2097152, array['image/jpeg', 'image/png']),
  ('store-logos', 'store-logos', true, 2097152, array['image/jpeg', 'image/png']),
  ('expense-proofs', 'expense-proofs', true, 10485760, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects
for select to public using (bucket_id = 'product-images');

drop policy if exists product_images_authenticated_write on storage.objects;
create policy product_images_authenticated_write on storage.objects
for all to authenticated
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images' and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png'));

drop policy if exists profile_images_public_read on storage.objects;
create policy profile_images_public_read on storage.objects
for select to public using (bucket_id = 'profile-images');

drop policy if exists profile_images_authenticated_write_own on storage.objects;
create policy profile_images_authenticated_write_own on storage.objects
for all to authenticated
using (bucket_id = 'profile-images' and split_part(name, '/', 1) = auth.uid()::text)
with check (
  bucket_id = 'profile-images'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png')
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists store_logos_public_read on storage.objects;
create policy store_logos_public_read on storage.objects
for select to public using (bucket_id = 'store-logos');

drop policy if exists store_logos_authenticated_write on storage.objects;
create policy store_logos_authenticated_write on storage.objects
for all to authenticated
using (bucket_id = 'store-logos')
with check (
  bucket_id = 'store-logos'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png')
);

drop policy if exists expense_proofs_public_read on storage.objects;
create policy expense_proofs_public_read on storage.objects
for select to public using (bucket_id = 'expense-proofs');

drop policy if exists expense_proofs_authenticated_write on storage.objects;
create policy expense_proofs_authenticated_write on storage.objects
for all to authenticated
using (bucket_id = 'expense-proofs')
with check (
  bucket_id = 'expense-proofs'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'pdf')
);

notify pgrst, 'reload schema';
