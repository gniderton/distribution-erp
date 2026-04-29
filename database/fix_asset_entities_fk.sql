-- 1. Drop the incorrect foreign key constraint that points to bank_accounts
ALTER TABLE asset_entities DROP CONSTRAINT IF EXISTS asset_entities_bank_account_id_fkey;

-- 2. Add the correct foreign key constraint that points to master_banks
ALTER TABLE asset_entities 
ADD CONSTRAINT asset_entities_bank_account_id_fkey 
FOREIGN KEY (bank_account_id) REFERENCES master_banks(id);

-- Optional: Add index for performance
CREATE INDEX IF NOT EXISTS idx_asset_entities_bank_account_id ON asset_entities(bank_account_id);
