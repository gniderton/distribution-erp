-- 140_add_invoice_rounding_col.sql
-- Ensure the 'round_off' column exists in 'sales_invoices'

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_invoices' AND column_name = 'round_off') THEN
        ALTER TABLE sales_invoices ADD COLUMN round_off NUMERIC(12, 2) DEFAULT 0;
    END IF;
END $$;
