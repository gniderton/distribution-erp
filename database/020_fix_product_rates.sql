-- Increase precision for Product Rates
-- Old: numeric(10, 5) -> Max 99,999.99999
-- New: numeric(15, 5) -> Max 9,999,999,999.99999 (Supports Billions)

ALTER TABLE products 
  ALTER COLUMN purchase_rate TYPE numeric(15, 5),
  ALTER COLUMN distributor_rate TYPE numeric(15, 5),
  ALTER COLUMN wholesale_rate TYPE numeric(15, 5),
  ALTER COLUMN dealer_rate TYPE numeric(15, 5),
  ALTER COLUMN retail_rate TYPE numeric(15, 5);

-- MRP limit was 999 Lakhs, usually fine, but let's bump to 15,2 to match
ALTER TABLE products
  ALTER COLUMN mrp TYPE numeric(15, 2);
