-- Migration: DSE Payment Allocation System
-- Purpose: Enable DSE-specified allocations with sync validation and advance payments

-- 1. Add status column to payment_allocations
-- This tracks allocation lifecycle: PENDING (DSE entered) → ACTIVE (verified) → REVERSED (rejected)
ALTER TABLE payment_allocations 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE' 
CHECK (status IN ('PENDING', 'ACTIVE', 'REVERSED'));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_pa_status 
ON payment_allocations(status);

-- Add metadata columns for conflict tracking
ALTER TABLE payment_allocations
ADD COLUMN IF NOT EXISTS expected_invoice_balance NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN payment_allocations.status IS 
'Allocation status: PENDING (DSE entered, awaiting verification), ACTIVE (verified and applied), REVERSED (rejected or adjusted)';

COMMENT ON COLUMN payment_allocations.expected_invoice_balance IS 
'Invoice balance at time of DSE entry, used for conflict detection during sync';

-- 2. Create customer_advances table
-- Stores advance payments (payments with no invoice allocation)
CREATE TABLE IF NOT EXISTS customer_advances (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    payment_id BIGINT NOT NULL REFERENCES customer_payments(id),
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    balance NUMERIC(15,2) NOT NULL CHECK (balance >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ca_customer ON customer_advances(customer_id);
CREATE INDEX IF NOT EXISTS idx_ca_payment ON customer_advances(payment_id);
CREATE INDEX IF NOT EXISTS idx_ca_active ON customer_advances(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE customer_advances IS 
'Stores advance payments that have no invoice allocation. Balance decreases as advances are utilized against future invoices.';

-- 3. Create advance_utilizations table
-- Tracks when advances are used against invoices
CREATE TABLE IF NOT EXISTS advance_utilizations (
    id BIGSERIAL PRIMARY KEY,
    advance_id BIGINT NOT NULL REFERENCES customer_advances(id),
    invoice_id BIGINT NOT NULL REFERENCES sales_invoices(id),
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by BIGINT REFERENCES employees(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_au_advance ON advance_utilizations(advance_id);
CREATE INDEX IF NOT EXISTS idx_au_invoice ON advance_utilizations(invoice_id);

COMMENT ON TABLE advance_utilizations IS 
'Tracks utilization of customer advances against invoices. Links advances to invoices they were applied to.';

-- 4. Add offline_id to customer_payments for DSE sync tracking
ALTER TABLE customer_payments
ADD COLUMN IF NOT EXISTS offline_id VARCHAR(100) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_cp_offline_id ON customer_payments(offline_id);

COMMENT ON COLUMN customer_payments.offline_id IS 
'Unique identifier from DSE app for sync tracking and duplicate prevention';

-- 5. Update existing allocations to ACTIVE status
UPDATE payment_allocations 
SET status = 'ACTIVE' 
WHERE status IS NULL;

-- 6. Create view for customer advance balance
CREATE OR REPLACE VIEW view_customer_advance_balance AS
SELECT 
    ca.customer_id,
    c.customer_name,
    SUM(ca.balance) as total_advance_balance,
    COUNT(ca.id) as advance_count,
    MAX(ca.created_at) as last_advance_date
FROM customer_advances ca
JOIN customers c ON ca.customer_id = c.id
WHERE ca.is_active = TRUE 
  AND ca.balance > 0
GROUP BY ca.customer_id, c.customer_name;

COMMENT ON VIEW view_customer_advance_balance IS 
'Summary of customer advance balances for quick lookup';
