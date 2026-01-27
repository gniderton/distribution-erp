-- Add customer_code to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_code text UNIQUE;
