-- 163_normalize_assets_schema.sql

-- 1. Add entity ID columns
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS purchase_entity_id BIGINT REFERENCES asset_entities(id),
ADD COLUMN IF NOT EXISTS sale_entity_id BIGINT REFERENCES asset_entities(id);

-- 2. Migrate existing vendor_id to purchase_entity_id (if safe)
-- Since vendor_id was relaxed, we'll just keep it or alias it in code.
-- For now, we'll just use purchase_entity_id as the primary link.

-- 3. Make redundant columns nullable (preparation for removal)
ALTER TABLE assets 
ALTER COLUMN sale_buyer_name DROP NOT NULL,
ALTER COLUMN sale_buyer_gst DROP NOT NULL,
ALTER COLUMN sale_buyer_address DROP NOT NULL;

-- 4. Add index for performance
CREATE INDEX IF NOT EXISTS idx_assets_purchase_entity ON assets(purchase_entity_id);
CREATE INDEX IF NOT EXISTS idx_assets_sale_entity ON assets(sale_entity_id);
