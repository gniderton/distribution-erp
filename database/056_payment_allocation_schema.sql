-- 056_payment_allocation_schema.sql

-- 1. Allocation Table (Link Payment -> Invoice)
CREATE TABLE IF NOT EXISTS payment_allocations (
    id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT REFERENCES customer_payments(id) ON DELETE CASCADE,
    invoice_id BIGINT REFERENCES sales_invoices(id),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    allocated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Add 'amount_paid' to Sales Invoices (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_invoices' AND column_name = 'amount_paid') THEN
        ALTER TABLE sales_invoices ADD COLUMN amount_paid NUMERIC(12, 2) DEFAULT 0;
    END IF;
END $$;

-- 3. Add 'payment_number' to Customer Payments (Sequence)
-- (If not already present, safe to ensure)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_payments' AND column_name = 'payment_number') THEN
        ALTER TABLE customer_payments ADD COLUMN payment_number VARCHAR(50);
    END IF;
END $$;
