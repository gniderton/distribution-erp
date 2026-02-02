-- Schema enhancements for comprehensive scheme management
-- Adds support for combo schemes, price slabs, and channel-specific tiers

-- 1. Add new columns to scheme_rules
ALTER TABLE scheme_rules 
ADD COLUMN IF NOT EXISTS scheme_type VARCHAR(50) DEFAULT 'BUY_GET_FREE' 
    CHECK (scheme_type IN ('BUY_GET_FREE', 'COMBO', 'PRICE_SLAB')),
ADD COLUMN IF NOT EXISTS special_price NUMERIC(10,2), -- For PRICE_SLAB type
ADD COLUMN IF NOT EXISTS channel_tier VARCHAR(50); -- 'Wholesaler', 'Dealer', 'Retail', NULL = All

-- 2. Create combo products junction table
CREATE TABLE IF NOT EXISTS scheme_combo_products (
    id BIGSERIAL PRIMARY KEY,
    scheme_rule_id BIGINT REFERENCES scheme_rules(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(scheme_rule_id, product_id)
);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheme_rules_type ON scheme_rules(scheme_type);
CREATE INDEX IF NOT EXISTS idx_scheme_rules_channel ON scheme_rules(channel_tier);
CREATE INDEX IF NOT EXISTS idx_combo_products_rule ON scheme_combo_products(scheme_rule_id);

-- 4. Add comments for clarity
COMMENT ON COLUMN scheme_rules.scheme_type IS 'Type of scheme: BUY_GET_FREE, COMBO, or PRICE_SLAB';
COMMENT ON COLUMN scheme_rules.special_price IS 'Special price for PRICE_SLAB schemes';
COMMENT ON COLUMN scheme_rules.channel_tier IS 'Customer channel: Wholesaler, Dealer, Retail, or NULL for all';
COMMENT ON TABLE scheme_combo_products IS 'Products that combine for COMBO scheme triggers';
