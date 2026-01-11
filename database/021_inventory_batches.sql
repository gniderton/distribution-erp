-- Phase 16: FIFO Inventory Batches
-- This table tracks every "lot" of inventory separately.

CREATE TABLE inventory_batches (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    grn_id BIGINT, -- Nullable for Opening Stock / Adjustments
    batch_code TEXT NOT NULL, -- e.g. "GRN-101-A" or "OP-STK-001"
    
    -- Costs & Prices
    mrp NUMERIC(15, 2) NOT NULL DEFAULT 0,
    purchase_rate NUMERIC(15, 5) NOT NULL DEFAULT 0, -- Actual cost for this specific batch
    
    -- Quantities
    quantity_initial NUMERIC(12, 3) NOT NULL DEFAULT 0,
    quantity_remaining NUMERIC(12, 3) NOT NULL DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expiry_date DATE, -- Optional, good for future
    is_active BOOLEAN DEFAULT TRUE
);

-- Index for FIFO lookup (Oldest First)
CREATE INDEX idx_batches_fifo ON inventory_batches (product_id, created_at ASC) WHERE quantity_remaining > 0;
