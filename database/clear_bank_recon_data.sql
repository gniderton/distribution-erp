-- clear_bank_recon_data.sql
-- Resets bank reconciliation data for a fresh upload

-- 1. Unlink bank entries from customer payments
UPDATE customer_payments SET bank_statement_entry_id = NULL, verification_status = 'Pending' WHERE bank_statement_entry_id IS NOT NULL;

-- 2. Truncate bank statement entries
TRUNCATE TABLE bank_statement_entries RESTART IDENTITY CASCADE;

-- 3. Reset payment status if they were auto-verified
UPDATE customer_payments SET verification_status = 'Pending' WHERE verification_status = 'Verified' AND payment_mode IN ('NEFT', 'UPI');
