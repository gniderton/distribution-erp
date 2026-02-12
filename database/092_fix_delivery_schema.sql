-- Fix Delivery Schema (Adding Missing Columns)

DO $$ 
BEGIN 
    -- 1. Add vehicle_number to delivery_trips if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_trips' AND column_name='vehicle_number') THEN
        ALTER TABLE delivery_trips ADD COLUMN vehicle_number TEXT;
    END IF;

    -- 2. Add created_by to delivery_trips if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_trips' AND column_name='created_by') THEN
        ALTER TABLE delivery_trips ADD COLUMN created_by BIGINT REFERENCES employees(id);
    END IF;
    
    -- 3. Add updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_trips' AND column_name='updated_at') THEN
        ALTER TABLE delivery_trips ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- 4. Trip Invoices SHOULD exist, but if not, create it
    CREATE TABLE IF NOT EXISTS trip_invoices (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        trip_id BIGINT REFERENCES delivery_trips(id) ON DELETE CASCADE,
        invoice_id BIGINT REFERENCES sales_invoices(id),
        sequence_no INT DEFAULT 0,
        delivery_status TEXT DEFAULT 'Pending' CHECK (delivery_status IN ('Pending', 'Delivered', 'Partial', 'Returned', 'Undelivered')),
        delivery_time TIMESTAMPTZ,
        customer_signature_url TEXT,
        notes TEXT,
        submitted_at TIMESTAMPTZ,
        UNIQUE(trip_id, invoice_id)
    );
END $$;
