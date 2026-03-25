-- 184_customer_verification_requests.sql

-- 1. Create Staging Table for DSE Submissions
CREATE TABLE IF NOT EXISTS customer_verification_requests (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Link to existing customer (NULL if creating a NEW customer)
    customer_id BIGINT REFERENCES customers(id),
    
    -- DSE Captured Data
    dse_id BIGINT REFERENCES employees(id),
    proposed_customer_name TEXT,
    proposed_phone TEXT,
    proposed_gstin TEXT,
    latitude NUMERIC(15,10),
    longitude NUMERIC(15,10),
    
    -- Status & Audit
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    reviewed_at TIMESTAMPTZ,
    reviewed_by BIGINT REFERENCES employees(id),
    rejection_reason TEXT
);

-- 2. Add Indexing
CREATE INDEX idx_cust_verify_status ON customer_verification_requests(status);
CREATE INDEX idx_cust_verify_dse ON customer_verification_requests(dse_id);

-- 3. Cleanup previous approach (optional but clean)
-- We can keep the verification_status on 'customers' as a simple flag: 'Verified' or 'Unverified'
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
