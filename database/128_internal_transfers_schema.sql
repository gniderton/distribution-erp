-- 128_internal_transfers_schema.sql
-- Support for Cash to Bank, Bank to Bank Transfers (Within same branch)

-- 1. Create Internal Transfers Table
CREATE TABLE IF NOT EXISTS internal_transfers (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    from_account_id INTEGER NOT NULL REFERENCES bank_accounts(id),
    to_account_id INTEGER NOT NULL REFERENCES bank_accounts(id),
    
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('Cash', 'Online', 'Cheque')),
    
    reference_no TEXT, -- UTR / Ref No
    remarks TEXT,
    
    journal_entry_id BIGINT REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Index
CREATE INDEX IF NOT EXISTS idx_internal_transfers_date ON internal_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_internal_transfers_from ON internal_transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_internal_transfers_to ON internal_transfers(to_account_id);
