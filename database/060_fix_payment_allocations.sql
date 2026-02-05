-- 060_fix_payment_allocations.sql
-- Add invoice_id to payment_allocations for Sales Invoices

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_allocations' AND column_name = 'invoice_id') THEN
        ALTER TABLE payment_allocations ADD COLUMN invoice_id BIGINT REFERENCES sales_invoices(id);
    END IF;
END $$;
