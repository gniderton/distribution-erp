-- 084_fix_bank_amount_constraint.sql
-- Allow zero in the legacy amount column to support debit transactions

ALTER TABLE bank_statement_entries 
DROP CONSTRAINT IF EXISTS bank_statement_entries_amount_check;

ALTER TABLE bank_statement_entries 
ADD CONSTRAINT bank_statement_entries_amount_check CHECK (amount >= 0);
