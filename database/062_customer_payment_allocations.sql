-- 062_customer_payment_allocations.sql
-- Dedicated table for Customer Payments -> Sales Invoices

CREATE TABLE IF NOT EXISTS customer_payment_allocations (
    id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT REFERENCES customer_payments(id) ON DELETE CASCADE,
    invoice_id BIGINT REFERENCES sales_invoices(id),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    allocated_at TIMESTAMP DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_cust_alloc_pay ON customer_payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_cust_alloc_inv ON customer_payment_allocations(invoice_id);
