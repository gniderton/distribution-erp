-- 083_targeted_schemes.sql
-- Support for targeted customers and products in schemes

-- 1. Add FLAT_MRP_DISCOUNT to scheme_type constraint
-- First drop existing constraint if possible, or just ignore if it's already VARCHAR
-- The previous migration used: CHECK (scheme_type IN ('BUY_GET_FREE', 'COMBO', 'PRICE_SLAB'))
ALTER TABLE scheme_rules DROP CONSTRAINT IF EXISTS scheme_rules_scheme_type_check;
ALTER TABLE scheme_rules ADD CONSTRAINT scheme_rules_scheme_type_check 
CHECK (scheme_type IN ('BUY_GET_FREE', 'COMBO', 'PRICE_SLAB', 'FLAT_MRP_DISCOUNT'));

-- 2. Create Targeted Customers Junction Table
CREATE TABLE IF NOT EXISTS scheme_targeted_customers (
    id BIGSERIAL PRIMARY KEY,
    scheme_id BIGINT REFERENCES schemes(id) ON DELETE CASCADE,
    customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(scheme_id, customer_id)
);

-- 3. Create Targeted Products Junction Table (for specific products within a brand/rule)
CREATE TABLE IF NOT EXISTS scheme_targeted_products (
    id BIGSERIAL PRIMARY KEY,
    scheme_rule_id BIGINT REFERENCES scheme_rules(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(scheme_rule_id, product_id)
);

-- 4. Add Indexes for targeting lookup
CREATE INDEX IF NOT EXISTS idx_targeted_customers_scheme ON scheme_targeted_customers(scheme_id);
CREATE INDEX IF NOT EXISTS idx_targeted_customers_cust ON scheme_targeted_customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_targeted_products_rule ON scheme_targeted_products(scheme_rule_id);
CREATE INDEX IF NOT EXISTS idx_targeted_products_prod ON scheme_targeted_products(product_id);
