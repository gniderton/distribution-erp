-- Add new columns to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS pan TEXT,
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_line2 TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_no TEXT,
ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;

-- Index for faster search on PAN if needed
CREATE INDEX IF NOT EXISTS idx_vendors_pan ON vendors(pan);
