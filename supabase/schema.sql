-- =====================================================
-- Bizzy App Business Management System Database Schema
-- UUID-first POS / retail structure for Supabase
--
-- Keep the existing public.profiles table. Run this after deleting the
-- old operational tables, or on a fresh Supabase project.
-- =====================================================

create extension if not exists pgcrypto;

alter table public.profiles
add column if not exists updated_at timestamptz not null default now();

-- Shared helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_expense_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_name text;
begin
  select name into profile_name
  from public.profiles
  where id = auth.uid()
  limit 1;

  if coalesce(new.created_by, '') = '' then
    new.created_by = coalesce(profile_name, 'Unknown User');
  end if;

  return new;
end;
$$;

create or replace function public.set_inventory_codes()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.product_code, '') = '' then
      new.product_code = 'PRD-' || lpad(nextval('public.inventory_product_code_seq')::text, 6, '0');
    end if;

    if coalesce(new.sku, '') = '' then
      new.sku = 'SKU-' || lpad(nextval('public.inventory_sku_seq')::text, 6, '0');
    end if;
  elsif tg_op = 'UPDATE' then
    if new.product_code is distinct from old.product_code then
      raise exception 'product_code cannot be changed after creation';
    end if;

    if new.sku is distinct from old.sku then
      raise exception 'sku cannot be changed after creation';
    end if;
  end if;

  return new;
end;
$$;

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

-- Customers
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null check (btrim(phone) <> ''),
  address text,
  remarks text,
  debt_limit numeric(12,2) not null default 0 check (debt_limit >= 0),
  visiting_day text not null default 'Sunday'
    check (visiting_day in ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  outstanding_balance numeric(12,2) not null default 0,
  status text not null default 'Active'
    check (status in ('Active', 'Inactive', 'Blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Suppliers
create sequence if not exists public.supplier_code_seq;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_code text not null unique,
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  category text,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  joined_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Inventory
create table if not exists public.inventory_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_code text not null unique,
  product_name text not null,
  sku text not null unique,
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sales (POS)
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  receipt_number text unique,
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
  payment_method text not null
    check (payment_method in ('Cash', 'MoMo', 'Cheque', 'Bank Transfer', 'Credit')),
  status text not null default 'completed'
    check (status in ('completed', 'refunded', 'voided', 'credit')),
  cashier text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  inventory_id uuid references public.inventory(id) on delete set null,
  product_code text not null,
  product_name text not null,
  quantity integer not null default 1 check (quantity >= 0),
  returned_quantity integer not null default 0 check (returned_quantity >= 0),
  net_quantity integer generated always as (quantity - returned_quantity) stored,
  unit_price numeric(12,2) not null default 0,
  unit_cost numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  line_cost numeric(12,2) not null default 0,
  line_margin numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Receipt records are kept separately from sales so receipt print/output
-- history can evolve without changing the accounting sale.
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  receipt_number text not null unique,
  issued_at timestamptz not null default now(),
  customer_name text,
  cashier text,
  subtotal numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  payment_method text,
  receipt_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  sale_id text,
  invoice_number text,
  receipt_id uuid references public.receipts(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null
    check (payment_method in ('Cash', 'MoMo', 'Cheque', 'Bank Transfer')),
  notes text default '',
  created_at timestamptz default now()
);

-- Purchases
create sequence if not exists public.purchase_number_seq;

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_number text not null unique,
  supplier_id uuid references public.suppliers(id) on delete set null,
  supplier_code text,
  supplier_name text not null,
  purchase_date date not null default current_date,
  expected_date date,
  item_count integer not null default 0 check (item_count >= 0),
  subtotal numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  status text not null default 'Pending'
    check (status in ('Pending', 'Received', 'Partial', 'Cancelled')),
  payment_status text not null default 'Unpaid'
    check (payment_status in ('Unpaid', 'Paid', 'Partial', 'Refunded')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  inventory_id uuid references public.inventory(id) on delete set null,
  product_code text,
  product_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_cost numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Expenses
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null,
  description text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  paid_by text not null default 'Cash'
    check (paid_by in ('Cash', 'MoMo', 'Cheque', 'Bank Transfer')),
  notes text,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bank Deposits
create table if not exists public.banks (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null check (btrim(bank_name) <> ''),
  branch text not null check (btrim(branch) <> ''),
  address text not null check (btrim(address) <> ''),
  telephone text not null check (btrim(telephone) <> ''),
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bank_name, branch)
);

create table if not exists public.bank_deposits (
  id uuid primary key default gen_random_uuid(),
  deposit_date date not null default current_date,
  bank_id uuid references public.banks(id) on delete set null,
  bank_name text not null check (btrim(bank_name) <> ''),
  account_no text not null check (btrim(account_no) <> ''),
  amount numeric(12,2) not null default 0 check (amount > 0),
  remarks text,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Store Settings
create table if not exists public.store_settings (
  id uuid primary key default gen_random_uuid(),
  settings_key text not null unique default 'default',
  store_name text not null default 'Bizzy App Business Management System Store',
  store_address text,
  store_phone text,
  store_email text,
  store_sender_id text not null default '' check (store_sender_id = '' or store_sender_id ~ '^[A-Za-z0-9 ]{3,11}$'),
  invoice_sms_template text not null default '' check (char_length(invoice_sms_template) <= 320),
  payment_sms_template text not null default '' check (char_length(payment_sms_template) <= 320),
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
  receipt_theme text not null default 'minimal'
    check (receipt_theme in ('minimal', 'classic', 'modern')),
  timezone text not null default 'Africa/Accra',
  invoice_due_days integer not null default 30 check (invoice_due_days >= 0 and invoice_due_days <= 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_inventory_category_id on public.inventory(category_id);
create index if not exists idx_inventory_supplier_id on public.inventory(supplier_id);
create index if not exists idx_sales_sale_date on public.sales(sale_date desc);
create index if not exists idx_sales_customer_id on public.sales(customer_id);
create index if not exists idx_sales_invoice_number on public.sales(invoice_number);
create index if not exists idx_sale_items_sale_id on public.sale_items(sale_id);
create index if not exists idx_receipts_sale_id on public.receipts(sale_id);
create index if not exists idx_credit_payments_customer_id on public.credit_payments(customer_id);
create index if not exists idx_credit_payments_invoice_number on public.credit_payments(invoice_number);
create index if not exists idx_credit_payments_receipt_id on public.credit_payments(receipt_id);
create index if not exists idx_purchases_supplier_id on public.purchases(supplier_id);
create index if not exists idx_purchases_purchase_date on public.purchases(purchase_date desc);
create index if not exists idx_purchase_items_purchase_id on public.purchase_items(purchase_id);
create index if not exists idx_expenses_expense_date on public.expenses(expense_date desc);
create index if not exists idx_banks_bank_name on public.banks(bank_name);
create index if not exists idx_bank_deposits_deposit_date on public.bank_deposits(deposit_date desc);
create index if not exists idx_bank_deposits_bank_id on public.bank_deposits(bank_id);
create index if not exists idx_bank_deposits_bank_name on public.bank_deposits(bank_name);

-- updated_at triggers
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists set_suppliers_updated_at on public.suppliers;
create trigger set_suppliers_updated_at before update on public.suppliers
for each row execute function public.set_updated_at();

drop trigger if exists set_supplier_code on public.suppliers;
create trigger set_supplier_code before insert on public.suppliers
for each row execute function public.set_supplier_code();

drop trigger if exists set_inventory_categories_updated_at on public.inventory_categories;
create trigger set_inventory_categories_updated_at before update on public.inventory_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_inventory_updated_at on public.inventory;
create trigger set_inventory_updated_at before update on public.inventory
for each row execute function public.set_updated_at();

create sequence if not exists public.inventory_product_code_seq;
create sequence if not exists public.inventory_sku_seq;

drop trigger if exists set_inventory_codes on public.inventory;
create trigger set_inventory_codes before insert or update on public.inventory
for each row execute function public.set_inventory_codes();

drop trigger if exists set_sales_updated_at on public.sales;
create trigger set_sales_updated_at before update on public.sales
for each row execute function public.set_updated_at();

drop trigger if exists set_purchases_updated_at on public.purchases;
create trigger set_purchases_updated_at before update on public.purchases
for each row execute function public.set_updated_at();

drop trigger if exists set_purchase_number on public.purchases;
create trigger set_purchase_number before insert on public.purchases
for each row execute function public.set_purchase_number();

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at before update on public.expenses
for each row execute function public.set_updated_at();

drop trigger if exists set_expense_created_by on public.expenses;
create trigger set_expense_created_by before insert on public.expenses
for each row execute function public.set_expense_created_by();

drop trigger if exists set_bank_deposits_updated_at on public.bank_deposits;
create trigger set_bank_deposits_updated_at before update on public.bank_deposits
for each row execute function public.set_updated_at();

drop trigger if exists set_banks_updated_at on public.banks;
create trigger set_banks_updated_at before update on public.banks
for each row execute function public.set_updated_at();

drop trigger if exists set_bank_created_by on public.banks;
create trigger set_bank_created_by before insert on public.banks
for each row execute function public.set_expense_created_by();

drop trigger if exists set_bank_deposit_created_by on public.bank_deposits;
create trigger set_bank_deposit_created_by before insert on public.bank_deposits
for each row execute function public.set_expense_created_by();

drop trigger if exists set_store_settings_updated_at on public.store_settings;
create trigger set_store_settings_updated_at before update on public.store_settings
for each row execute function public.set_updated_at();

-- =====================================================
-- Row Level Security
-- =====================================================

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
alter table public.credit_payments enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.expenses enable row level security;
alter table public.banks enable row level security;
alter table public.bank_deposits enable row level security;
alter table public.store_settings enable row level security;

alter table public.profiles force row level security;
alter table public.customers force row level security;
alter table public.suppliers force row level security;
alter table public.inventory_categories force row level security;
alter table public.inventory force row level security;
alter table public.sales force row level security;
alter table public.sale_items force row level security;
alter table public.receipts force row level security;
alter table public.credit_payments force row level security;
alter table public.purchases force row level security;
alter table public.purchase_items force row level security;
alter table public.expenses force row level security;
alter table public.banks force row level security;
alter table public.bank_deposits force row level security;
alter table public.store_settings force row level security;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Profiles
drop policy if exists "profiles_select_active_users" on public.profiles;
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin_user());

drop policy if exists "profiles_insert_self_or_admin" on public.profiles;
drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin"
on public.profiles for insert
to authenticated
with check (public.is_admin_user());

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
on public.profiles for delete
to authenticated
using (public.is_admin_user());

-- Customers: cashiers need POS customer access; managers/admins also manage.
drop policy if exists "customers_select_active_users" on public.customers;
create policy "customers_select_active_users"
on public.customers for select
to authenticated
using (public.is_active_app_user());

drop policy if exists "customers_insert_active_users" on public.customers;
create policy "customers_insert_active_users"
on public.customers for insert
to authenticated
with check (public.is_active_app_user());

drop policy if exists "customers_update_active_users" on public.customers;
create policy "customers_update_active_users"
on public.customers for update
to authenticated
using (public.is_active_app_user())
with check (public.is_active_app_user());

drop policy if exists "customers_delete_backoffice" on public.customers;
create policy "customers_delete_backoffice"
on public.customers for delete
to authenticated
using (public.is_backoffice_user());

-- Inventory catalog: all active users can read for POS; back office manages.
drop policy if exists "inventory_categories_select_active_users" on public.inventory_categories;
create policy "inventory_categories_select_active_users"
on public.inventory_categories for select
to authenticated
using (public.is_active_app_user());

drop policy if exists "inventory_categories_manage_backoffice" on public.inventory_categories;
create policy "inventory_categories_manage_backoffice"
on public.inventory_categories for all
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

drop policy if exists "inventory_select_active_users" on public.inventory;
create policy "inventory_select_active_users"
on public.inventory for select
to authenticated
using (public.is_active_app_user());

drop policy if exists "inventory_manage_backoffice" on public.inventory;
create policy "inventory_manage_backoffice"
on public.inventory for all
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

-- Sales / Receipts: cashiers can create POS transactions; admin/manager can manage.
drop policy if exists "sales_select_active_users" on public.sales;
create policy "sales_select_active_users"
on public.sales for select
to authenticated
using (public.is_active_app_user());

drop policy if exists "sales_insert_active_users" on public.sales;
create policy "sales_insert_active_users"
on public.sales for insert
to authenticated
with check (public.is_active_app_user());

drop policy if exists "sales_update_active_users" on public.sales;
create policy "sales_update_active_users"
on public.sales for update
to authenticated
using (public.is_active_app_user())
with check (public.is_active_app_user());

drop policy if exists "sales_delete_admin" on public.sales;
create policy "sales_delete_admin"
on public.sales for delete
to authenticated
using (public.is_admin_user());

drop policy if exists "sale_items_select_active_users" on public.sale_items;
create policy "sale_items_select_active_users"
on public.sale_items for select
to authenticated
using (public.is_active_app_user());

drop policy if exists "sale_items_insert_active_users" on public.sale_items;
create policy "sale_items_insert_active_users"
on public.sale_items for insert
to authenticated
with check (public.is_active_app_user());

drop policy if exists "sale_items_update_backoffice" on public.sale_items;
create policy "sale_items_update_backoffice"
on public.sale_items for update
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

drop policy if exists "sale_items_delete_admin" on public.sale_items;
create policy "sale_items_delete_admin"
on public.sale_items for delete
to authenticated
using (public.is_admin_user());

drop policy if exists "receipts_select_active_users" on public.receipts;
create policy "receipts_select_active_users"
on public.receipts for select
to authenticated
using (public.is_active_app_user());

drop policy if exists "receipts_insert_active_users" on public.receipts;
create policy "receipts_insert_active_users"
on public.receipts for insert
to authenticated
with check (public.is_active_app_user());

drop policy if exists "receipts_update_backoffice" on public.receipts;
create policy "receipts_update_backoffice"
on public.receipts for update
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

drop policy if exists "receipts_delete_admin" on public.receipts;
create policy "receipts_delete_admin"
on public.receipts for delete
to authenticated
using (public.is_admin_user());

drop policy if exists "credit_payments_select_active_users" on public.credit_payments;
create policy "credit_payments_select_active_users"
on public.credit_payments for select
to authenticated
using (public.is_active_app_user());

drop policy if exists "credit_payments_insert_active_users" on public.credit_payments;
create policy "credit_payments_insert_active_users"
on public.credit_payments for insert
to authenticated
with check (public.is_active_app_user());

drop policy if exists "credit_payments_update_backoffice" on public.credit_payments;
create policy "credit_payments_update_backoffice"
on public.credit_payments for update
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

drop policy if exists "credit_payments_delete_admin" on public.credit_payments;
create policy "credit_payments_delete_admin"
on public.credit_payments for delete
to authenticated
using (public.is_admin_user());

-- Back-office modules.
drop policy if exists "suppliers_select_backoffice" on public.suppliers;
create policy "suppliers_select_backoffice"
on public.suppliers for select
to authenticated
using (public.is_backoffice_user());

drop policy if exists "suppliers_manage_backoffice" on public.suppliers;
create policy "suppliers_manage_backoffice"
on public.suppliers for all
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

drop policy if exists "purchases_select_backoffice" on public.purchases;
create policy "purchases_select_backoffice"
on public.purchases for select
to authenticated
using (public.is_backoffice_user());

drop policy if exists "purchases_manage_backoffice" on public.purchases;
create policy "purchases_manage_backoffice"
on public.purchases for all
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

drop policy if exists "purchase_items_select_backoffice" on public.purchase_items;
create policy "purchase_items_select_backoffice"
on public.purchase_items for select
to authenticated
using (public.is_backoffice_user());

drop policy if exists "purchase_items_manage_backoffice" on public.purchase_items;
create policy "purchase_items_manage_backoffice"
on public.purchase_items for all
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

drop policy if exists "expenses_select_backoffice" on public.expenses;
create policy "expenses_select_backoffice"
on public.expenses for select
to authenticated
using (public.is_backoffice_user());

drop policy if exists "expenses_manage_backoffice" on public.expenses;
create policy "expenses_manage_backoffice"
on public.expenses for all
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

drop policy if exists "bank_deposits_select_backoffice" on public.bank_deposits;
create policy "bank_deposits_select_backoffice"
on public.bank_deposits for select
to authenticated
using (public.is_backoffice_user());

drop policy if exists "banks_select_backoffice" on public.banks;
create policy "banks_select_backoffice"
on public.banks for select
to authenticated
using (public.is_backoffice_user());

drop policy if exists "banks_manage_backoffice" on public.banks;
create policy "banks_manage_backoffice"
on public.banks for all
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

drop policy if exists "bank_deposits_manage_backoffice" on public.bank_deposits;
create policy "bank_deposits_manage_backoffice"
on public.bank_deposits for all
to authenticated
using (public.is_backoffice_user())
with check (public.is_backoffice_user());

drop policy if exists "store_settings_select_active_users" on public.store_settings;
create policy "store_settings_select_active_users"
on public.store_settings for select
to authenticated
using (public.is_active_app_user());

drop policy if exists "store_settings_manage_admin" on public.store_settings;
create policy "store_settings_manage_admin"
on public.store_settings for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
