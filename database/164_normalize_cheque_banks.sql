-- 164_normalize_cheque_banks.sql

-- 1. Add bank_id column
ALTER TABLE cheques ADD COLUMN IF NOT EXISTS bank_id INTEGER REFERENCES master_banks(id);

-- 2. Data Migration: Match existing bank_name text to master_banks.id
UPDATE cheques 
SET bank_id = mb.id 
FROM master_banks mb 
WHERE cheques.bank_id IS NULL 
  AND TRIM(UPPER(cheques.bank_name)) = TRIM(UPPER(mb.bank_name));

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_cheques_bank_id ON cheques(bank_id);
