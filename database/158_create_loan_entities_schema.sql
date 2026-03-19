-- Migration: Create Loan Entities Master Table

CREATE TABLE IF NOT EXISTS loan_entities (
    id SERIAL PRIMARY KEY,
    entity_name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- e.g., 'Bank', 'Employee', 'Director', 'Financial Institution', 'Other'
    role_type VARCHAR(50) NOT NULL, -- e.g., 'Provider', 'Receiver', 'Both'
    contact_number VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_loan_entities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_loan_entities_updated_at ON loan_entities;
CREATE TRIGGER trigger_update_loan_entities_updated_at
BEFORE UPDATE ON loan_entities
FOR EACH ROW
EXECUTE FUNCTION update_loan_entities_updated_at();
