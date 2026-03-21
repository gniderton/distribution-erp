-- 172_add_bank_details_to_entities.sql

ALTER TABLE income_entities 
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_no TEXT,
ADD COLUMN IF NOT EXISTS ifsc_code TEXT;

ALTER TABLE expense_entities 
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_no TEXT,
ADD COLUMN IF NOT EXISTS ifsc_code TEXT;
