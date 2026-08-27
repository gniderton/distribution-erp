-- 208_asset_advanced_features.sql

-- Alter assets table to include advanced tracking features
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS custodian VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_scrapped BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS scrap_date DATE,
ADD COLUMN IF NOT EXISTS scrap_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS scrap_remarks TEXT;

-- Table for tracking custody/assignments
CREATE TABLE IF NOT EXISTS asset_assignments (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id),
    assigned_to VARCHAR(255) NOT NULL,
    assigned_date DATE NOT NULL,
    return_date DATE,
    status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'Returned'
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for tracking maintenance and warranty logs
CREATE TABLE IF NOT EXISTS asset_maintenance (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id),
    maintenance_date DATE NOT NULL,
    amount DECIMAL(15,2) DEFAULT 0,
    service_provider VARCHAR(255),
    warranty_expiry_date DATE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for tracking documents (Phase 2)
CREATE TABLE IF NOT EXISTS asset_documents (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id),
    document_type VARCHAR(100), -- 'Invoice', 'Warranty', 'Insurance', 'Photo'
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(100)
);
