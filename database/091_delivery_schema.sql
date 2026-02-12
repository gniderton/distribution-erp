-- Delivery Module Schema
-- Phase 63: Supply Chain / Delivery

-- 1. Delivery Trips (Run Sheets)
CREATE TABLE IF NOT EXISTS delivery_trips (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    trip_number TEXT NOT NULL UNIQUE, -- e.g., TRIP-YY-001
    
    vehicle_number TEXT, -- Simple text for now
    driver_id BIGINT REFERENCES employees(id), -- Team Lead
    
    status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'In Transit', 'Completed', 'Verified', 'Cancelled')),
    
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by BIGINT REFERENCES employees(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Modify Sales Invoices (Add Delivery Status)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_invoices' AND column_name='delivery_status') THEN
        ALTER TABLE sales_invoices ADD COLUMN delivery_status TEXT DEFAULT 'Pending' 
        CHECK (delivery_status IN ('Pending', 'In Transit', 'Delivered', 'Returned', 'Partial', 'Undelivered'));
    END IF;
END $$;

-- 3. Trip Invoices (Junction)
CREATE TABLE IF NOT EXISTS trip_invoices (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    trip_id BIGINT REFERENCES delivery_trips(id) ON DELETE CASCADE,
    invoice_id BIGINT REFERENCES sales_invoices(id),
    
    sequence_no INT DEFAULT 0,
    
    -- Status for this specific attempt
    delivery_status TEXT DEFAULT 'Pending' CHECK (delivery_status IN ('Pending', 'Delivered', 'Partial', 'Returned', 'Undelivered')),
    
    delivery_time TIMESTAMPTZ,
    customer_signature_url TEXT,
    notes TEXT,
    
    submitted_at TIMESTAMPTZ,
    UNIQUE(trip_id, invoice_id)
);

-- 4. Trip Returns (Item Level)
CREATE TABLE IF NOT EXISTS trip_returns (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    trip_id BIGINT REFERENCES delivery_trips(id),
    invoice_id BIGINT REFERENCES sales_invoices(id),
    product_id BIGINT REFERENCES products(id),
    
    return_type TEXT CHECK (return_type IN ('Instant Rejection', 'Expiry/Damage Return')),
    qty NUMERIC(12,2) NOT NULL,
    reason TEXT,
    
    -- Verification
    verification_status TEXT DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Approved', 'Rejected')),
    verified_by BIGINT REFERENCES employees(id),
    verified_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Modify Customers (Geolocation)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='latitude') THEN
        ALTER TABLE customers ADD COLUMN latitude NUMERIC(10, 7);
        ALTER TABLE customers ADD COLUMN longitude NUMERIC(10, 7);
        ALTER TABLE customers ADD COLUMN route_sequence INT DEFAULT 0;
    END IF;
END $$;

-- 6. Trip Sequence
CREATE SEQUENCE IF NOT EXISTS trip_number_seq;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trip_invoices_trip ON trip_invoices(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_invoices_inv ON trip_invoices(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_inv_delivery ON sales_invoices(delivery_status);
