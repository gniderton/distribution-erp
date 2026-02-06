-- 083_full_statement_schema.sql
-- Expand bank statement entries to store full history (Credits & Debits)

-- 1. Modify the table to support debits and nullable ref IDs
ALTER TABLE bank_statement_entries 
ALTER COLUMN bank_ref_id DROP NOT NULL;

ALTER TABLE bank_statement_entries 
ADD COLUMN IF NOT EXISTS debit_amount NUMERIC(12, 2) DEFAULT 0 CHECK (debit_amount >= 0),
ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(12, 2) DEFAULT 0 CHECK (credit_amount >= 0);

-- 2. Migrate existing data
UPDATE bank_statement_entries SET credit_amount = amount WHERE credit_amount = 0;

-- 3. Update unique constraint to handle all transactions (not just those with Ref ID)
ALTER TABLE bank_statement_entries DROP CONSTRAINT IF EXISTS unique_bank_tx;

ALTER TABLE bank_statement_entries 
ADD CONSTRAINT unique_full_bank_tx UNIQUE (transaction_date, particulars, debit_amount, credit_amount);
