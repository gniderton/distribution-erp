-- 127_add_sale_created_by_to_assets.sql
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS sale_created_by INTEGER;
