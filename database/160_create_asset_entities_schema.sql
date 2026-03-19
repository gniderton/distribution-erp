-- 160_create_asset_entities_schema.sql
-- Unified Master for Asset Vendors and Asset Customers

-- 1. Create the entities table
CREATE TABLE IF NOT EXISTS asset_entities (
    id BIGSERIAL PRIMARY KEY,
    entity_code TEXT UNIQUE NOT NULL, -- Auto-generated (e.g. ASENT-0001)
    entity_type TEXT NOT NULL CHECK (entity_type IN ('VENDOR', 'CUSTOMER', 'BOTH')),
    
    entity_name TEXT NOT NULL,
    contact_number TEXT,
    email TEXT,
    gst_number TEXT,
    pan_number TEXT,
    
    address TEXT,
    state TEXT,
    district TEXT,
    pincode TEXT,
    
    -- Bank details for Vendor payments
    bank_account_id BIGINT REFERENCES bank_accounts(id),
    account_no TEXT,
    ifsc_code TEXT,
    
    opening_balance NUMERIC(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Setup Document Sequence for Asset Entities
INSERT INTO document_sequences (document_type, prefix, current_number) 
VALUES ('ASSET_ENT', 'ASENT-', 1)
ON CONFLICT (document_type) DO NOTHING;

-- 3. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_asset_entities_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_asset_entities_timestamp
    BEFORE UPDATE ON asset_entities
    FOR EACH ROW
    EXECUTE FUNCTION update_asset_entities_timestamp();
