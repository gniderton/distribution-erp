-- Add Customer Code (External ID from Book8)
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS customer_code text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_customer_code ON customers(customer_code);
