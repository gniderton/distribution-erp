-- 126_add_addresses_to_asset_sale.sql
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS sale_buyer_address TEXT,
ADD COLUMN IF NOT EXISTS sale_delivery_address TEXT;
