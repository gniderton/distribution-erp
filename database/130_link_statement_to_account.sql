-- 120_link_statement_to_account.sql
-- Add bank_account_id to bank_statement_entries for strict reconciliation linkage

-- 1. Add Column
ALTER TABLE bank_statement_entries 
ADD COLUMN IF NOT EXISTS bank_account_id INTEGER REFERENCES bank_accounts(id);

-- 2. Drop legacy unique constraint if it exists (065_bank_statement_unique_constraint.sql used 3-tuple usually)
-- We want a strictly safer one including the specific account
ALTER TABLE bank_statement_entries DROP CONSTRAINT IF EXISTS bank_statement_entries_transaction_date_particulars_debit_am_key;

-- 3. Add Robust Unique Constraint
-- Prevents the same transaction from being uploaded twice for the SAME account
ALTER TABLE bank_statement_entries 
ADD CONSTRAINT bank_stmt_unique_entry 
UNIQUE (bank_account_id, transaction_date, particulars, bank_ref_id, debit_amount, credit_amount);

-- 4. Update index for account-based lookups
CREATE INDEX IF NOT EXISTS idx_bank_recon_account ON bank_statement_entries(bank_account_id);
