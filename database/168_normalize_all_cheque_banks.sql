-- 168_normalize_all_cheque_banks.sql

-- 1. Add bank_id to customer_payments
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS bank_id BIGINT REFERENCES master_banks(id);

-- 2. Migrate existing bank_name to bank_id in customer_payments
UPDATE customer_payments cp
SET bank_id = mb.id
FROM master_banks mb
WHERE cp.bank_id IS NULL 
  AND cp.bank_name IS NOT NULL
  AND (cp.bank_name ILIKE mb.bank_name OR mb.bank_name ILIKE '%' || cp.bank_name || '%');

-- 3. Ensure cheques table has foreign key constraint (if not already added)
-- Note: bank_id was added in 164, but we want to ensure the FK is clear
ALTER TABLE cheques DROP CONSTRAINT IF EXISTS cheques_bank_id_fkey;
ALTER TABLE cheques ADD CONSTRAINT cheques_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES master_banks(id);

-- 4. Re-migrate cheques.bank_name to bank_id (catch-up)
UPDATE cheques c
SET bank_id = mb.id
FROM master_banks mb
WHERE c.bank_id IS NULL 
  AND c.bank_name IS NOT NULL
  AND (c.bank_name ILIKE mb.bank_name OR mb.bank_name ILIKE '%' || c.bank_name || '%');
