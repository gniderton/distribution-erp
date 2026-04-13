-- Opening Balances Schema
CREATE TABLE IF NOT EXISTS opening_balances (
    id SERIAL PRIMARY KEY,
    reference_no VARCHAR(50) UNIQUE NOT NULL,
    account_id INTEGER REFERENCES chart_of_accounts(id),
    amount DECIMAL(15, 2) NOT NULL,
    as_of_date DATE DEFAULT '2026-03-31',
    description TEXT,
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    is_active BOOLEAN DEFAULT true
);

-- Seed document sequence for Opening Balances using correct schema
INSERT INTO document_sequences (document_type, prefix, current_number, is_active)
VALUES ('OPENING_BAL', 'OPEN-26-', 0, true)
ON CONFLICT (document_type) DO NOTHING;
