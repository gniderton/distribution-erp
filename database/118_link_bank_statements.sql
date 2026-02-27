-- 118_link_bank_statements.sql
-- Add bank_statement_entry_id to financial tables for automatic reconciliation tracking

-- 1. Other Income
ALTER TABLE other_income ADD COLUMN IF NOT EXISTS bank_statement_entry_id BIGINT REFERENCES bank_statement_entries(id);

-- 2. Expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS bank_statement_entry_id BIGINT REFERENCES bank_statement_entries(id);

-- 3. Vendor Payments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_payments') THEN
        ALTER TABLE vendor_payments ADD COLUMN IF NOT EXISTS bank_statement_entry_id BIGINT REFERENCES bank_statement_entries(id);
    END IF;
END $$;
