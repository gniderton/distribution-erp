-- 065_bank_statement_unique_constraint.sql
-- Prevent duplicate bank statement entries

ALTER TABLE bank_statement_entries 
ADD CONSTRAINT unique_bank_tx UNIQUE (bank_ref_id, amount, transaction_date);
