-- Table: master_banks
-- Usage: Dropdown list for Vendor Bank Names (prevents spelling errors)
CREATE TABLE IF NOT EXISTS master_banks (
    id SERIAL PRIMARY KEY,
    bank_name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true
);

-- Seed Common Bank Names
INSERT INTO master_banks (bank_name) VALUES
('HDFC Bank'),
('State Bank of India (SBI)'),
('ICICI Bank'),
('Axis Bank'),
('Kotak Mahindra Bank'),
('Punjab National Bank (PNB)'),
('Bank of Baroda'),
('Canara Bank'),
('Union Bank of India'),
('IDFC First Bank'),
('IndusInd Bank'),
('Yes Bank'),
('Federal Bank'),
('Bank of India'),
('Central Bank of India'),
('Indian Bank'),
('Indian Overseas Bank'),
('UCO Bank'),
('Bank of Maharashtra'),
('Punjab & Sind Bank')
ON CONFLICT (bank_name) DO NOTHING;

-- Not deleting old column yet, just adding new FK if desired in future.
-- For now, vendors.bank_name is text, but we will populate it from this list in UI.
