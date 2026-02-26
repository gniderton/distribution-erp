-- Phase 113: Support Payment Modes for DSE Expenses

ALTER TABLE dse_expenses ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20) DEFAULT 'Cash';
ALTER TABLE dse_expenses ADD COLUMN IF NOT EXISTS bank_account_id INTEGER REFERENCES bank_accounts(id);

-- Optional: If bank_account_id is NULL, we assume it's "Cash in Hand" (Account 1003)
-- If payment_mode is 'Card', the user should provide the bank_account_id of that Credit Card.
