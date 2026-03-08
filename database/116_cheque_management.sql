-- 116_cheque_management.sql
-- 1. Add Clearing Accounts to Chart of Accounts
INSERT INTO chart_of_accounts (id, code, name, type, is_active)
VALUES 
    (1004, 1004, 'Cheques in Hand', 'ASSET', true),
    (2004, 2004, 'Cheques Issued', 'LIABILITY', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create Cheques Table
CREATE TABLE IF NOT EXISTS cheques (
    id SERIAL PRIMARY KEY,
    cheque_number VARCHAR(50) NOT NULL,
    cheque_date DATE NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('INCOMING', 'OUTGOING')),
    party_type VARCHAR(50) NOT NULL, -- 'CUSTOMER', 'VENDOR', 'OTHER_INCOME', 'EXPENSE'
    party_id INTEGER, -- Links to customer_id, vendor_id, etc.
    reference_type VARCHAR(50) NOT NULL, -- 'CUSTOMER_PAYMENT', 'VENDOR_PAYMENT', 'OTHER_INCOME', 'EXPENSE'
    reference_id INTEGER NOT NULL, -- Links to payment_id, income_id, etc.
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED')),
    clearance_date DATE,
    bank_account_id INTEGER REFERENCES bank_accounts(id), -- The account it clears into/from
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add sequence if not exists
INSERT INTO document_sequences (document_type, prefix, current_number)
VALUES ('CHQ', 'CHQ-', 0)
ON CONFLICT (document_type) DO NOTHING;
