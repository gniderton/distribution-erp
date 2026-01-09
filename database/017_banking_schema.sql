-- 1. Create Bank Accounts Table
CREATE TABLE IF NOT EXISTS bank_accounts (
    id SERIAL PRIMARY KEY,
    bank_name text NOT NULL,
    account_number text, -- Optional for Cash
    current_balance numeric(12,2) DEFAULT 0.00,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 2. Seed Initial Accounts
INSERT INTO bank_accounts (bank_name, account_number, current_balance) 
VALUES 
('Cash in Hand', 'CASH', 0.00),
('Axis Bank', 'AXIS-XXXX', 0.00),
('IDFC First Bank', 'IDFC-XXXX', 0.00)
ON CONFLICT DO NOTHING;

-- 3. Update Vendor Payments to Link to Bank
ALTER TABLE vendor_payments 
ADD COLUMN IF NOT EXISTS bank_account_id integer REFERENCES bank_accounts(id);
