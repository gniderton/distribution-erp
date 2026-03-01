-- 125_asset_sale_gst_hsn_seq.sql
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS sale_hsn_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS sale_invoice_number VARCHAR(50) UNIQUE;

-- Seed sequence for Asset Sale Invoice
INSERT INTO document_sequences (document_type, prefix, current_number, is_active)
SELECT 'ASSET_SALE_INV', 'ASI-', 0, true
WHERE NOT EXISTS (SELECT 1 FROM document_sequences WHERE document_type = 'ASSET_SALE_INV');
