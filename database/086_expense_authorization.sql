-- Phase 59: Expense Authorization Schema

-- 1. Add Status to Line-Item Expenses
ALTER TABLE dse_expenses 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Verified', 'Rejected')),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS verified_by BIGINT REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

-- 2. Add Daily Expense Authorization to Reports
ALTER TABLE daily_sales_reports
ADD COLUMN IF NOT EXISTS expense_auth_status VARCHAR(20) DEFAULT 'Not Required' CHECK (expense_auth_status IN ('Not Required', 'Pending', 'Authorized')),
ADD COLUMN IF NOT EXISTS expense_auth_remark TEXT,
ADD COLUMN IF NOT EXISTS expense_auth_by BIGINT REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS expense_auth_at TIMESTAMP;

-- 3. Add Expense Verification to Reports (The "Green Thumb" Gate)
ALTER TABLE daily_sales_reports
ADD COLUMN IF NOT EXISTS all_expenses_verified BOOLEAN DEFAULT FALSE;
