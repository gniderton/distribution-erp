-- Migration 205: Create deleted_grns_log Table for GRN Hard Delete Auditing

CREATE TABLE IF NOT EXISTS deleted_grns_log (
    id SERIAL PRIMARY KEY,
    deleted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_by_id BIGINT,
    reason TEXT NOT NULL,
    original_invoice_id BIGINT NOT NULL,
    original_invoice_number TEXT NOT NULL, -- Explains sequence gap
    vendor_invoice_number TEXT,
    vendor_id BIGINT NOT NULL,
    grand_total NUMERIC(12,2) NOT NULL,
    original_grn_data JSONB NOT NULL -- Full serialized JSON representation
);

CREATE INDEX IF NOT EXISTS idx_deleted_grn_num ON deleted_grns_log(original_invoice_number);
CREATE INDEX IF NOT EXISTS idx_deleted_grn_vendor ON deleted_grns_log(vendor_id);
