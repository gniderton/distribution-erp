-- 055_schemes_schema.sql

-- 1. Schemes Header (The Campaign)
CREATE TABLE IF NOT EXISTS schemes (
    id BIGSERIAL PRIMARY KEY,
    scheme_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by BIGINT -- Link to employee/admin
);

-- 2. Scheme Rules (The Logic)
-- Supports: 
-- "Buy X of Product A, Get Y of Product A" (Same Product)
-- "Buy X of Brand B, Get Y of Product C" (Cross Product)
-- "Buy X Cases, Get Y Pcs" (UOM logic)
CREATE TABLE IF NOT EXISTS scheme_rules (
    id BIGSERIAL PRIMARY KEY,
    scheme_id BIGINT REFERENCES schemes(id) ON DELETE CASCADE,
    
    -- TRIGGER (What they buy)
    trigger_type VARCHAR(50) CHECK (trigger_type IN ('Product', 'Brand', 'Category')), 
    trigger_id BIGINT NOT NULL, -- ProductID, BrandID, or CategoryID
    min_qty INTEGER NOT NULL, -- The "Buy" quantity (e.g., 11, 12, 72)
    is_case_qty BOOLEAN DEFAULT false, -- If true, min_qty refers to CASES, not Units
    
    -- REWARD (What they get)
    reward_product_id BIGINT, -- If null, implies same as trigger (only valid for Product trigger)
    reward_qty INTEGER NOT NULL, -- The "Get" quantity (e.g. 1, 2, 18)
    
    -- CONFIG
    tier_level INTEGER DEFAULT 1, -- For Tiered schemes (12->2 is Tier 1, 72->18 is Tier 2)
    is_recursive BOOLEAN DEFAULT true -- If true, 22 buys gets 2 free. If false, cap at 1 set.
);

-- Index for fast lookup during Order Entry
CREATE INDEX idx_scheme_rules_trigger ON scheme_rules(trigger_type, trigger_id);
CREATE INDEX idx_schemes_date ON schemes(start_date, end_date, is_active);

-- Seed Data (Based on User Examples)
-- We will do this via script to ensure IDs match valid products/brands
