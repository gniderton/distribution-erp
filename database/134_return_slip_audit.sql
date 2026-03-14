-- Add converted_from_rs for auditing
ALTER TABLE debit_notes ADD COLUMN IF NOT EXISTS converted_from_rs TEXT;
