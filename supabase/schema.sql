-- =====================================================
-- SPark360 Database Schema
-- Paste this entire file into Supabase → SQL Editor → Run
-- =====================================================

-- Inventory Categories
CREATE TABLE IF NOT EXISTS inventory_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
  item_id       text PRIMARY KEY,
  product_name  text NOT NULL,
  sku           text DEFAULT '',
  category      text DEFAULT '',
  supplier      text DEFAULT '',
  cost_price    numeric(12,2) NOT NULL DEFAULT 0,
  selling_price numeric(12,2) NOT NULL DEFAULT 0,
  current_stock int  NOT NULL DEFAULT 0,
  reorder_level int  NOT NULL DEFAULT 10,
  image         text DEFAULT '',
  created_at    timestamptz DEFAULT now()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  customer_id         text PRIMARY KEY,
  full_name           text NOT NULL,
  company_name        text DEFAULT '',
  customer_type       text NOT NULL DEFAULT 'Retail',
  phone               text DEFAULT '',
  email               text DEFAULT '',
  total_purchases     numeric(12,2) NOT NULL DEFAULT 0,
  outstanding_balance numeric(12,2) NOT NULL DEFAULT 0,
  status_flag         text NOT NULL DEFAULT 'Active',
  avatar              text DEFAULT '',
  last_order_date     text DEFAULT '',
  created_at          timestamptz DEFAULT now()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  contact      text DEFAULT '',
  phone        text DEFAULT '',
  email        text DEFAULT '',
  address      text DEFAULT '',
  category     text DEFAULT '',
  total_orders int  NOT NULL DEFAULT 0,
  total_spent  numeric(12,2) NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'active',
  joined_date  text DEFAULT '',
  notes        text DEFAULT '',
  created_at   timestamptz DEFAULT now()
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id             text PRIMARY KEY,
  supplier_id    text REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name  text NOT NULL,
  date           text NOT NULL,
  expected_date  text DEFAULT '',
  items          int  NOT NULL DEFAULT 0,
  total          numeric(12,2) NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'Pending',
  payment_status text NOT NULL DEFAULT 'Unpaid',
  notes          text DEFAULT '',
  created_at     timestamptz DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  invoice_no     text PRIMARY KEY,
  date           text NOT NULL,
  customer_id    text DEFAULT '',
  customer_name  text NOT NULL,
  net_sales      numeric(12,2) NOT NULL DEFAULT 0,
  total_cost     numeric(12,2) NOT NULL DEFAULT 0,
  gross_margin   numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL,
  status         text NOT NULL DEFAULT 'completed',
  cashier        text DEFAULT '',
  created_at     timestamptz DEFAULT now()
);

-- Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no   text NOT NULL REFERENCES invoices(invoice_no) ON DELETE CASCADE,
  product_id   text NOT NULL,
  product_name text NOT NULL,
  qty          int  NOT NULL DEFAULT 0,
  returns_qty  int  NOT NULL DEFAULT 0,
  net_qty      int  NOT NULL DEFAULT 0,
  unit_price   numeric(12,2) NOT NULL DEFAULT 0,
  cost_price   numeric(12,2) NOT NULL DEFAULT 0,
  net_sales    numeric(12,2) NOT NULL DEFAULT 0,
  total_cost   numeric(12,2) NOT NULL DEFAULT 0,
  gross_margin numeric(12,2) NOT NULL DEFAULT 0
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  expense_id  text PRIMARY KEY,
  date        text NOT NULL,
  category    text NOT NULL,
  description text NOT NULL,
  amount_ghs  numeric(12,2) NOT NULL DEFAULT 0,
  paid_by     text NOT NULL DEFAULT 'Cash',
  notes       text DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  email         text UNIQUE NOT NULL,
  role          text NOT NULL DEFAULT 'cashier',
  initials      text NOT NULL,
  avatar_color  text NOT NULL,
  password_hash text,
  created_at    timestamptz DEFAULT now()
);

-- Store Settings (always one row, id = 1)
CREATE TABLE IF NOT EXISTS store_settings (
  id                   int  PRIMARY KEY DEFAULT 1,
  store_name           text DEFAULT 'SPark360 Store',
  store_address        text DEFAULT '123 Market Street, Downtown, NY 10001',
  store_phone          text DEFAULT '+1 (555) 234-5678',
  store_email          text DEFAULT 'store@spark360.com',
  store_logo           text DEFAULT '',
  currency             text DEFAULT 'GHS',
  currency_symbol      text DEFAULT '₵',
  tax_rate             numeric(5,2) DEFAULT 10,
  tax_label            text DEFAULT 'VAT',
  tax_enabled          bool DEFAULT true,
  receipt_footer       text DEFAULT 'Thank you for shopping with us! Returns accepted within 7 days with receipt.',
  receipt_show_logo    bool DEFAULT true,
  receipt_show_tax     bool DEFAULT true,
  receipt_show_barcode bool DEFAULT true,
  receipt_theme        text DEFAULT 'minimal',
  timezone             text DEFAULT 'Africa/Accra'
);

-- ── Disable RLS (development mode — add policies before going live) ──────────
ALTER TABLE inventory_categories  DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items       DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers             DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers             DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders       DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices              DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items         DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses              DISABLE ROW LEVEL SECURITY;
ALTER TABLE users                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings        DISABLE ROW LEVEL SECURITY;
