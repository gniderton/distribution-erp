-- 129_add_recon_to_transfers.sql
-- Add bank reconciliation and denomination support to Internal Transfers

-- 1. Add columns to internal_transfers
ALTER TABLE internal_transfers 
ADD COLUMN IF NOT EXISTS from_bank_statement_entry_id INTEGER REFERENCES bank_statement_entries(id),
ADD COLUMN IF NOT EXISTS to_bank_statement_entry_id INTEGER REFERENCES bank_statement_entries(id),
ADD COLUMN IF NOT EXISTS denominations JSONB;

-- 2. Add indices for performance
CREATE INDEX IF NOT EXISTS idx_internal_transfers_from_bs ON internal_transfers(from_bank_statement_entry_id);
CREATE INDEX IF NOT EXISTS idx_internal_transfers_to_bs ON internal_transfers(to_bank_statement_entry_id);
