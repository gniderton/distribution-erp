-- 064_bank_statement_schema.sql
-- Table to store uploaded bank statement entries for auto-reconciliation

CREATE TABLE IF NOT EXISTS bank_statement_entries (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    transaction_date DATE NOT NULL,
    bank_name TEXT, -- 'IDFC' or 'Axis'
    particulars TEXT NOT NULL,
    bank_ref_id TEXT NOT NULL, -- The extracted Reference ID (UTR/UPI ID)
    
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    consumed_amount NUMERIC(12, 2) DEFAULT 0 CHECK (consumed_amount >= 0),
    
    status TEXT DEFAULT 'Available' CHECK (status IN ('Available', 'Partially Consumed', 'Exhausted')),
    
    upload_batch_id TEXT, -- To track entries uploaded together
    
    CONSTRAINT check_amount_limit CHECK (consumed_amount <= amount)
);

-- Index for fast matching by Reference ID
CREATE INDEX IF NOT EXISTS idx_bank_recon_ref ON bank_statement_entries(bank_ref_id);
CREATE INDEX IF NOT EXISTS idx_bank_recon_status ON bank_statement_entries(status);

-- Add bank_statement_entry_id to customer_payments to link them once verified
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS bank_statement_entry_id BIGINT REFERENCES bank_statement_entries(id);
