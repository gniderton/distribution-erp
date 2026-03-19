-- 162_asset_purchase_sequence.sql

-- 1. Add asset_purchase_no column
ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_purchase_no TEXT UNIQUE;

-- 2. Register sequences in document_sequences
INSERT INTO document_sequences (document_type, prefix, current_number) 
VALUES ('ASSET_PURCHASE', 'ASP-26-', 1)
ON CONFLICT (document_type) DO NOTHING;

-- Ensure ASSET_SALE_INV prefix is correct
UPDATE document_sequences 
SET prefix = 'ASI-26-' 
WHERE document_type = 'ASSET_SALE_INV' AND prefix = 'ASI-';
