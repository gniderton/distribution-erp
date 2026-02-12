-- Phase 63.2: Delivery Teams & DSE Sorting

-- 1. Create Delivery Teams Table
CREATE TABLE IF NOT EXISTS delivery_teams (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL UNIQUE, -- e.g. "Team A (North)", "Team B (Fast)"
    
    vehicle_id BIGINT REFERENCES vehicles(id),
    driver_id BIGINT REFERENCES employees(id), -- Team Lead/Driver
    helper_ids JSONB, -- Array of helper IDs [1, 2]
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Update Delivery Trips to use Team (Optional but recommended)
ALTER TABLE delivery_trips ADD COLUMN IF NOT EXISTS team_id BIGINT REFERENCES delivery_teams(id);

-- 3. Ensure DSE relationship is clear (Sales Orders already have dse_id)
-- We need to ensure we can join sales_invoices -> sales_orders -> dse (employees) efficiently.
-- Adding index for performance if not exists
CREATE INDEX IF NOT EXISTS idx_sales_orders_dse ON sales_orders(dse_id);
