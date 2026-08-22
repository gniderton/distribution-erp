CREATE TABLE IF NOT EXISTS deleted_records_history (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- e.g., 'VENDOR_PAYMENT'
    entity_id INTEGER NOT NULL,
    reference_number VARCHAR(100), -- e.g., 'PAY-123456'
    record_data JSONB NOT NULL, -- The full JSON of the deleted record
    deleted_by VARCHAR(100) DEFAULT 'SYSTEM', -- Or User ID if available
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);
