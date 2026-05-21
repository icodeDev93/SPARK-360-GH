-- ============================================================
-- SPARK 360 — Credit & Invoice Feature Migrations
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- All statements are idempotent — safe to re-run at any time.
-- ============================================================

-- 1. Link credit sales to the customer who owes the money
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- 2. Make sure returned_quantity defaults to 0 (net_quantity is a generated column — never write it)
ALTER TABLE sale_items
  ALTER COLUMN returned_quantity SET DEFAULT 0;

-- 3. Customer credit balance (sum of unpaid credit sales)
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 4. Payment log — every time a credit invoice is settled
CREATE TABLE IF NOT EXISTS credit_payments (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id    UUID        REFERENCES customers(id) ON DELETE CASCADE,
  sale_id        TEXT,
  invoice_number TEXT,
  receipt_id     UUID        REFERENCES receipts(id) ON DELETE SET NULL,
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT        NOT NULL,
  notes          TEXT        DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS invoice_number TEXT;

UPDATE sales
SET invoice_number = receipt_number
WHERE invoice_number IS NULL;

ALTER TABLE sales
  ALTER COLUMN invoice_number SET NOT NULL;

ALTER TABLE sales
  ALTER COLUMN receipt_number DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sales_invoice_number_key
ON sales(invoice_number);

CREATE INDEX IF NOT EXISTS idx_credit_payments_invoice_number
ON credit_payments(invoice_number);

CREATE INDEX IF NOT EXISTS idx_credit_payments_receipt_id
ON credit_payments(receipt_id);

ALTER TABLE receipts
  DROP CONSTRAINT IF EXISTS receipts_sale_id_key;

CREATE INDEX IF NOT EXISTS idx_receipts_sale_id
ON receipts(sale_id);

-- 5. Enable real-time for credit_payments (safe to re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'credit_payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE credit_payments;
  END IF;
END $$;

-- 6. Invoice due-days setting
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS invoice_due_days INTEGER DEFAULT 30;

-- 7. Expense proof-of-payment URL
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- ============================================================
-- 8. Fix sales.payment_method — add 'Credit' to the whitelist
-- ============================================================
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;
ALTER TABLE sales ADD CONSTRAINT sales_payment_method_check
  CHECK (payment_method IN ('Cash', 'MoMo', 'Cheque', 'Bank Transfer', 'Credit'));

-- ============================================================
-- 9. Fix sales.status — add 'credit' to the whitelist
--    Keeps 'voided' for backward compatibility with old records.
-- ============================================================
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE sales ADD CONSTRAINT sales_status_check
  CHECK (status IN ('completed', 'refunded', 'voided', 'credit'));

-- ============================================================
-- 10. DB trigger — sync inventory on every sale_items change
--     This is the single source of truth for stock movement.
--     INSERT  → deduct full quantity sold
--     UPDATE  → add back any increase in returned_quantity
--     DELETE  → restore net quantity (sale deleted/voided)
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_inventory_on_sale_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE inventory
    SET current_stock = GREATEST(0, current_stock - NEW.quantity)
    WHERE product_code = NEW.product_code;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Only fire when returned_quantity actually increases (partial/full return)
    IF NEW.returned_quantity > OLD.returned_quantity THEN
      UPDATE inventory
      SET current_stock = current_stock + (NEW.returned_quantity - OLD.returned_quantity)
      WHERE product_code = NEW.product_code;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Sale row deleted — restore the net quantity that was sold
    UPDATE inventory
    SET current_stock = current_stock + (OLD.quantity - OLD.returned_quantity)
    WHERE product_code = OLD.product_code;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_inventory_on_sale_item ON public.sale_items;
CREATE TRIGGER sync_inventory_on_sale_item
AFTER INSERT OR UPDATE OF returned_quantity OR DELETE ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_on_sale_item();

-- ============================================================
-- 11. One-time backfill — apply stock deductions for any
--     existing sale_items rows that pre-date this trigger.
--     Safe to re-run: only touches products that have sales.
-- ============================================================
UPDATE public.inventory i
SET current_stock = GREATEST(0, i.current_stock
    - COALESCE(sold.total_qty, 0)
    + COALESCE(sold.total_returned, 0))
FROM (
  SELECT
    product_code,
    SUM(quantity)          AS total_qty,
    SUM(returned_quantity) AS total_returned
  FROM public.sale_items
  GROUP BY product_code
) sold
WHERE i.product_code = sold.product_code;

-- ============================================================
-- Verify — all six values should be 1 after a successful run
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name='sales'          AND column_name='customer_id')        AS sales_customer_id,
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name='customers'      AND column_name='outstanding_balance') AS customers_balance,
  (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_name='credit_payments')                                      AS credit_payments_table,
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name='store_settings' AND column_name='invoice_due_days')   AS settings_due_days,
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name='expenses'       AND column_name='proof_url')          AS expenses_proof_url,
  (SELECT COUNT(*) FROM information_schema.check_constraints
    WHERE constraint_name='sales_payment_method_check'
      AND check_clause LIKE '%Credit%')                                      AS payment_method_allows_credit;

-- ============================================================
-- 12. Inventory product structure fields
-- ============================================================
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS wholesale_cost_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (wholesale_cost_price >= 0),
  ADD COLUMN IF NOT EXISTS single_cost_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (single_cost_price >= 0),
  ADD COLUMN IF NOT EXISTS wholesale_selling_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (wholesale_selling_price >= 0),
  ADD COLUMN IF NOT EXISTS half_selling_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (half_selling_price >= 0),
  ADD COLUMN IF NOT EXISTS quarter_selling_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quarter_selling_price >= 0),
  ADD COLUMN IF NOT EXISTS single_selling_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (single_selling_price >= 0),
  ADD COLUMN IF NOT EXISTS wholesale_quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (wholesale_quantity >= 0),
  ADD COLUMN IF NOT EXISTS single_quantity INTEGER NOT NULL DEFAULT 0 CHECK (single_quantity >= 0),
  ADD COLUMN IF NOT EXISTS quantity_per_box INTEGER NOT NULL DEFAULT 0 CHECK (quantity_per_box >= 0),
  ADD COLUMN IF NOT EXISTS stock_limit INTEGER NOT NULL DEFAULT 0 CHECK (stock_limit >= 0),
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS price_levels JSONB NOT NULL DEFAULT '[]'::JSONB;

UPDATE public.inventory
SET
  single_cost_price = CASE WHEN single_cost_price = 0 THEN cost_price ELSE single_cost_price END,
  single_selling_price = CASE WHEN single_selling_price = 0 THEN selling_price ELSE single_selling_price END,
  wholesale_cost_price = CASE WHEN wholesale_cost_price = 0 THEN cost_price ELSE wholesale_cost_price END,
  wholesale_selling_price = CASE WHEN wholesale_selling_price = 0 THEN selling_price ELSE wholesale_selling_price END,
  single_quantity = CASE WHEN single_quantity = 0 THEN current_stock ELSE single_quantity END,
  stock_limit = CASE WHEN stock_limit = 0 THEN reorder_level ELSE stock_limit END;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 15. Sync role permissions for current pages
-- ============================================================
UPDATE public.role_permissions
SET permissions = array_append(permissions, 'credit')
WHERE role IN ('manager', 'cashier')
  AND 'customers' = ANY(permissions)
  AND NOT 'credit' = ANY(permissions);

UPDATE public.role_permissions
SET permissions = array_append(permissions, 'bank-deposit')
WHERE role IN ('manager', 'cashier')
  AND 'expenses' = ANY(permissions)
  AND NOT 'bank-deposit' = ANY(permissions);

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 14. Bank master records for deposit dropdown
-- ============================================================
CREATE TABLE IF NOT EXISTS public.banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL CHECK (btrim(bank_name) <> ''),
  branch TEXT NOT NULL CHECK (btrim(branch) <> ''),
  address TEXT NOT NULL CHECK (btrim(address) <> ''),
  telephone TEXT NOT NULL CHECK (btrim(telephone) <> ''),
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bank_name, branch)
);

ALTER TABLE public.bank_deposits
  ADD COLUMN IF NOT EXISTS bank_id UUID REFERENCES public.banks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_banks_bank_name ON public.banks(bank_name);
CREATE INDEX IF NOT EXISTS idx_bank_deposits_bank_id ON public.bank_deposits(bank_id);

DROP TRIGGER IF EXISTS set_banks_updated_at ON public.banks;
CREATE TRIGGER set_banks_updated_at BEFORE UPDATE ON public.banks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_bank_created_by ON public.banks;
CREATE TRIGGER set_bank_created_by BEFORE INSERT ON public.banks
FOR EACH ROW EXECUTE FUNCTION public.set_expense_created_by();

ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banks_select_backoffice" ON public.banks;
CREATE POLICY "banks_select_backoffice"
ON public.banks FOR SELECT
TO authenticated
USING (public.is_backoffice_user());

DROP POLICY IF EXISTS "banks_manage_backoffice" ON public.banks;
CREATE POLICY "banks_manage_backoffice"
ON public.banks FOR ALL
TO authenticated
USING (public.is_backoffice_user())
WITH CHECK (public.is_backoffice_user());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'banks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.banks;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 13. Bank deposit records
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bank_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_date DATE NOT NULL DEFAULT current_date,
  bank_name TEXT NOT NULL CHECK (btrim(bank_name) <> ''),
  account_no TEXT NOT NULL CHECK (btrim(account_no) <> ''),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount > 0),
  remarks TEXT,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_deposits_deposit_date ON public.bank_deposits(deposit_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_deposits_bank_name ON public.bank_deposits(bank_name);

DROP TRIGGER IF EXISTS set_bank_deposits_updated_at ON public.bank_deposits;
CREATE TRIGGER set_bank_deposits_updated_at BEFORE UPDATE ON public.bank_deposits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_bank_deposit_created_by ON public.bank_deposits;
CREATE TRIGGER set_bank_deposit_created_by BEFORE INSERT ON public.bank_deposits
FOR EACH ROW EXECUTE FUNCTION public.set_expense_created_by();

ALTER TABLE public.bank_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_deposits FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_deposits_select_backoffice" ON public.bank_deposits;
CREATE POLICY "bank_deposits_select_backoffice"
ON public.bank_deposits FOR SELECT
TO authenticated
USING (public.is_backoffice_user());

DROP POLICY IF EXISTS "bank_deposits_manage_backoffice" ON public.bank_deposits;
CREATE POLICY "bank_deposits_manage_backoffice"
ON public.bank_deposits FOR ALL
TO authenticated
USING (public.is_backoffice_user())
WITH CHECK (public.is_backoffice_user());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'bank_deposits'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_deposits;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
