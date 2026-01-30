-- Clear Customer Data Only (Keep Employees intact)
-- Tables: customers, customer_addresses, customer_brand_pricing

BEGIN;

-- Truncate customer tables and reset identity (auto-increment) to 1
TRUNCATE TABLE customers, customer_addresses, customer_brand_pricing RESTART IDENTITY CASCADE;

COMMIT;
