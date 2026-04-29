-- 203_employee_liabilities.sql
-- Tracking miscellaneous liabilities for final settlements

CREATE TABLE IF NOT EXISTS employee_liabilities (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('DAMAGE', 'MISSING_CASH', 'UNPAID_PURCHASE', 'SHORTAGE', 'OTHER')),
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SETTLED', 'CANCELLED')),
    salary_payment_id INTEGER, -- Link to employee_salaries(id) when settled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_emp_liabilities_emp ON employee_liabilities(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_liabilities_status ON employee_liabilities(status);
