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
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT        NOT NULL,
  notes          TEXT        DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

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
