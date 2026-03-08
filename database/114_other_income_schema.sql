-- Phase 114: Other Income (Non-Operating Income) Schema
-- 1. Add COA Accounts
INSERT INTO chart_of_accounts (code, name, type) VALUES
(4101, 'Interest Income', 'INCOME'),
(4102, 'Scrap Sales', 'INCOME'),
(4103, 'Miscellaneous Income', 'INCOME'),
(4104, 'Profit on Sale of Asset', 'INCOME')
ON CONFLICT (code) DO NOTHING;

-- 2. Create Other Income Table
CREATE TABLE IF NOT EXISTS other_income (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    income_number TEXT UNIQUE NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Links to Accounting
    category_account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
    destination_account_id INTEGER NOT NULL REFERENCES bank_accounts(id),
    journal_entry_id BIGINT REFERENCES journal_entries(id),
    
    -- Amount Details
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    
    -- Transaction Details
    received_from TEXT,
    reference_no TEXT, -- Transaction ID or Cheque No
    description TEXT,
    
    -- Metadata
    created_by BIGINT REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexing
CREATE INDEX idx_other_income_date ON other_income(transaction_date);
CREATE INDEX idx_other_income_category ON other_income(category_account_id);
CREATE INDEX idx_other_income_destination ON other_income(destination_account_id);

-- 3. Register Document Sequence
INSERT INTO document_sequences (document_type, prefix, current_number, company_settings_id, branch_id)
VALUES ('OTHER_INCOME', 'INC-', 0, 1, 1)
ON CONFLICT (document_type) DO NOTHING;
