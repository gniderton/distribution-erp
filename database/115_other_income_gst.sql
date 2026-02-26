-- Phase 115: Add GST Support to Other Income
ALTER TABLE other_income 
ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_gst_income BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gst_no TEXT;

-- Update existing records to set taxable_amount = amount if not already set
UPDATE other_income SET taxable_amount = amount WHERE taxable_amount = 0;
