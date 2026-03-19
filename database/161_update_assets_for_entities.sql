-- 161_update_assets_for_entities.sql

-- 1. Remove strict foreign key to trading vendors
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_vendor_id_fkey;

-- 2. Ensure all required columns exist (just in case)
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS is_gst_purchase BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gst_no VARCHAR(20),
ADD COLUMN IF NOT EXISTS bill_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS created_by INTEGER;
