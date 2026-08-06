-- Migration: Allow Credit Notes to generate Customer Advances
-- Purpose: Convert unutilized balances from Credit Notes into Customer Advances so they can be applied to future invoices.

-- 1. Drop NOT NULL constraint on payment_id
ALTER TABLE customer_advances ALTER COLUMN payment_id DROP NOT NULL;

-- 2. Add return_id reference
ALTER TABLE customer_advances ADD COLUMN IF NOT EXISTS return_id BIGINT REFERENCES sales_returns(id);

-- 3. Add CHECK constraint to ensure either payment or return is provided
ALTER TABLE customer_advances DROP CONSTRAINT IF EXISTS chk_advance_source;
ALTER TABLE customer_advances ADD CONSTRAINT chk_advance_source CHECK (
    (payment_id IS NOT NULL AND return_id IS NULL) OR 
    (payment_id IS NULL AND return_id IS NOT NULL)
);

-- 4. Add Index for performance
CREATE INDEX IF NOT EXISTS idx_ca_return ON customer_advances(return_id);

COMMENT ON COLUMN customer_advances.return_id IS 
'Reference to the Sales Return (Credit Note) that generated this advance balance';
