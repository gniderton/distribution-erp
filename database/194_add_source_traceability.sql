-- Add Source Traceability Columns to Journal Entries
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS source_table VARCHAR(100);
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS source_id BIGINT;

-- Add index for fast source lookups
CREATE INDEX IF NOT EXISTS idx_journal_source ON journal_entries(source_table, source_id);
