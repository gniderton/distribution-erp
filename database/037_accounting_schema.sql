-- 1. Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id SERIAL PRIMARY KEY,
    code INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Journal Entries (Header)
CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    transaction_date DATE NOT NULL,
    description TEXT,
    reference_type TEXT NOT NULL, -- 'GRN', 'PAYMENT', 'DN', 'ADJUSTMENT'
    reference_id BIGINT,          -- ID of the source transaction
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_journal_ref ON journal_entries(reference_type, reference_id);

-- 3. Journal Lines (Details)
CREATE TABLE IF NOT EXISTS journal_lines (
    id SERIAL PRIMARY KEY,
    journal_entry_id BIGINT REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES chart_of_accounts(id),
    debit NUMERIC(15, 2) DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(15, 2) DEFAULT 0 CHECK (credit >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX idx_journal_lines_account ON journal_lines(account_id);

-- 4. Seed Data (Standard COA)
INSERT INTO chart_of_accounts (code, name, type) VALUES
(1001, 'Inventory (Stock)', 'ASSET'),
(1002, 'Bank Account', 'ASSET'),
(1003, 'Cash in Hand', 'ASSET'),
(1010, 'GST Input - IGST', 'ASSET'),
(1011, 'GST Input - CGST', 'ASSET'),
(1012, 'GST Input - SGST', 'ASSET'),
(2001, 'Accounts Payable', 'LIABILITY'),
(2010, 'GST Output - IGST', 'LIABILITY'),
(2011, 'GST Output - CGST', 'LIABILITY'),
(2012, 'GST Output - SGST', 'LIABILITY'),
(3001, 'Retained Earnings', 'EQUITY'),
(4001, 'Sales Revenue', 'INCOME'),
(4002, 'Discount Received', 'INCOME'),
(5001, 'Cost of Goods Sold', 'EXPENSE'),
(5002, 'Inventory Loss', 'EXPENSE')
ON CONFLICT (code) DO NOTHING;

-- 5. Helper Function to Post Entries
CREATE OR REPLACE FUNCTION create_journal_entry(
    p_date DATE,
    p_desc TEXT,
    p_ref_type TEXT,
    p_ref_id BIGINT,
    p_lines_json JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_entry_id BIGINT;
    v_line JSONB;
    v_total_debit NUMERIC := 0;
    v_total_credit NUMERIC := 0;
BEGIN
    -- Insert Header
    INSERT INTO journal_entries (transaction_date, description, reference_type, reference_id)
    VALUES (p_date, p_desc, p_ref_type, p_ref_id)
    RETURNING id INTO v_entry_id;

    -- Insert Lines
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines_json)
    LOOP
        v_total_debit := v_total_debit + COALESCE((v_line->>'debit')::numeric, 0);
        v_total_credit := v_total_credit + COALESCE((v_line->>'credit')::numeric, 0);

        INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
        VALUES (
            v_entry_id, 
            (SELECT id FROM chart_of_accounts WHERE code = (v_line->>'code')::int), 
            COALESCE((v_line->>'debit')::numeric, 0),
            COALESCE((v_line->>'credit')::numeric, 0)
        );
    END LOOP;

    -- Validation
    IF v_total_debit != v_total_credit THEN
        RAISE EXCEPTION 'Journal Entry Unbalanced: Debit % != Credit %', v_total_debit, v_total_credit;
    END IF;

    RETURN v_entry_id;
END;
$$;
