-- Clear Master Data & Reset IDs
-- Tables: employees, customers, customer_addresses (and dependent pricing/routes links if needed)

BEGIN;

-- Truncate tables and reset identity (auto-increment) to 1
-- CASCADE ensures linked data (like customer_addresses) is also deleted safely
TRUNCATE TABLE employees, customers, customer_addresses, customer_brand_pricing RESTART IDENTITY CASCADE;

COMMIT;
