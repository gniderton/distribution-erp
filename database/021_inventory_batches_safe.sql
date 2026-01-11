-- Phase 16: FIFO Inventory Batches (SAFE)
DROP INDEX IF EXISTS idx_batches_fifo;
DROP TABLE IF EXISTS inventory_batches CASCADE;

CREATE TABLE inventory_batches (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    grn_id BIGINT, 
    batch_code TEXT NOT NULL, 
    mrp NUMERIC(15, 2) NOT NULL DEFAULT 0,
    purchase_rate NUMERIC(15, 5) NOT NULL DEFAULT 0,
    quantity_initial NUMERIC(12, 3) NOT NULL DEFAULT 0,
    quantity_remaining NUMERIC(12, 3) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_batches_fifo ON inventory_batches (product_id, created_at ASC) WHERE quantity_remaining > 0;
