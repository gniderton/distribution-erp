-- Phase 67.1: Refined Returns Schema
-- 1. Add breakdown columns to sales_return_lines
ALTER TABLE sales_return_lines 
ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS scheme_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12,2) DEFAULT 0;

-- 2. Update inventory_batches status constraint
ALTER TABLE inventory_batches DROP CONSTRAINT IF EXISTS inventory_batches_status_check;
ALTER TABLE inventory_batches ADD CONSTRAINT inventory_batches_status_check CHECK (status = ANY (ARRAY['Good'::text, 'Damage'::text, 'Expiry'::text]));
