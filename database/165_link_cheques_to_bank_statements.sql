-- 165_link_cheques_to_bank_statements.sql

-- 1. Add bank_statement_entry_id column
ALTER TABLE cheques ADD COLUMN IF NOT EXISTS bank_statement_entry_id BIGINT REFERENCES bank_statement_entries(id);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_cheques_statement_entry ON cheques(bank_statement_entry_id);
