
-- Migration: Warehouse Self-Collection Flow
-- 1. Update sales_invoices delivery_status constraint
ALTER TABLE sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_delivery_status_check;
ALTER TABLE sales_invoices ADD CONSTRAINT sales_invoices_delivery_status_check 
CHECK (delivery_status IN ('Pending', 'In Transit', 'Delivered', 'Returned', 'Partial', 'Undelivered', 'Self-Collected'));

-- 2. Create warehouse_collections table
CREATE TABLE IF NOT EXISTS warehouse_collections (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    invoice_id BIGINT UNIQUE NOT NULL REFERENCES sales_invoices(id),
    
    collector_name TEXT NOT NULL,
    collector_phone TEXT NOT NULL,
    collector_id_type TEXT NOT NULL, -- Aadhar, License, etc.
    collector_id_number TEXT NOT NULL,
    collector_document_name TEXT, -- Optional
    
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    created_by BIGINT REFERENCES employees(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_wh_collections_inv ON warehouse_collections(invoice_id);
CREATE INDEX IF NOT EXISTS idx_wh_collections_name ON warehouse_collections(collector_name);
