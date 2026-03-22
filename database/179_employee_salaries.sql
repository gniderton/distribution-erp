-- 1. Add COA for Salary Expense
INSERT INTO chart_of_accounts (code, name, type)
VALUES (5010, 'Employees Salary Expense', 'EXPENSE')
ON CONFLICT (code) DO NOTHING;

-- 2. Create Employee Salaries Table
CREATE TABLE IF NOT EXISTS employee_salaries (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    
    base_salary NUMERIC(15, 2) NOT NULL,
    
    absent_days INTEGER DEFAULT 0,
    half_days INTEGER DEFAULT 0,
    
    leave_deduction NUMERIC(15, 2) DEFAULT 0,
    advance_deduction NUMERIC(15, 2) DEFAULT 0,
    loan_deduction NUMERIC(15, 2) DEFAULT 0,
    other_deductions NUMERIC(15, 2) DEFAULT 0,
    
    net_salary NUMERIC(15, 2) NOT NULL,
    
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('Cash', 'Online')),
    from_account_id INTEGER NOT NULL REFERENCES bank_accounts(id),
    
    journal_entry_id BIGINT REFERENCES journal_entries(id),
    remarks TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER,
    
    UNIQUE(employee_id, month, year) -- Prevent double payment for the same month
);

-- 3. Add settlement flag to advances
ALTER TABLE employee_advances ADD COLUMN IF NOT EXISTS is_settled BOOLEAN DEFAULT FALSE;
ALTER TABLE employee_advances ADD COLUMN IF NOT EXISTS salary_payment_id INTEGER REFERENCES employee_salaries(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_emp_salary_month ON employee_salaries(month, year);
CREATE INDEX IF NOT EXISTS idx_emp_salary_emp ON employee_salaries(employee_id);
