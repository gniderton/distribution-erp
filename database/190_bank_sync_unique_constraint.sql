-- 190_bank_sync_unique_constraint.sql
-- Ensure we can deduplicate transactions from multiple sources (SMS, Email, Statement)

-- 1. Drop the old weak constraint if it exists
ALTER TABLE bank_statement_entries DROP CONSTRAINT IF EXISTS unique_bank_tx;

-- 2. Add a more robust constraint
-- Using (bank_account_id, bank_ref_id) ensures that the same UTR for the SAME account doesn't double-count.
-- If account_id is null (e.g. from a raw SMS before account matching), we still need deduplication.
-- So we include transaction_date and amount for legacy support.
ALTER TABLE bank_statement_entries 
ADD CONSTRAINT unique_bank_tx_v2 UNIQUE (bank_account_id, bank_ref_id, amount, transaction_date);
