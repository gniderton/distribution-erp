-- 1. Add COA for Salary Advances (Asset)
INSERT INTO chart_of_accounts (code, name, type)
VALUES (1020, 'Employee Salary Advances', 'ASSET')
ON CONFLICT (code) DO NOTHING;

-- 2. Create Salary Advances Table
CREATE TABLE IF NOT EXISTS employee_advances (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('Cash', 'Online')),
    from_account_id INTEGER NOT NULL REFERENCES bank_accounts(id),
    bank_statement_entry_id BIGINT REFERENCES bank_statement_entries(id),
    journal_entry_id BIGINT REFERENCES journal_entries(id),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER 
);

-- Index for reporting
CREATE INDEX IF NOT EXISTS idx_emp_advances_date ON employee_advances(advance_date);
CREATE INDEX IF NOT EXISTS idx_emp_advances_emp ON employee_advances(employee_id);

COMMENT ON TABLE employee_advances IS 'Tracks salary advances paid to employees and links to accounting journal entries.';
