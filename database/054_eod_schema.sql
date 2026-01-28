-- Table: daily_sales_reports
-- Captures the DSE's end-of-day summary for verification.
CREATE TABLE IF NOT EXISTS daily_sales_reports (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    dse_id bigint REFERENCES employees(id) NOT NULL,
    report_date date NOT NULL DEFAULT CURRENT_DATE,
    
    -- Metrics (Calculated by App/Backend)
    total_sales_amount numeric(12,2) DEFAULT 0,
    total_payment_collection numeric(12,2) DEFAULT 0, -- Total Collected (Cash + Bank)
    total_cash_collected numeric(12,2) DEFAULT 0,     -- Cash Component Only
    
    -- Reconcilliation
    total_expense_claimed numeric(12,2) DEFAULT 0,
    cash_to_submit numeric(12,2) DEFAULT 0, -- (Cash Collected - Expense)
    
    -- Status
    status text CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
    admin_remarks text,
    
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    
    UNIQUE(dse_id, report_date) -- One report per DSE per day
);

-- Table: cash_denominations
-- Breakup of cash notes submitted (e.g., 500x10, 200x5)
CREATE TABLE IF NOT EXISTS cash_denominations (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    report_id bigint REFERENCES daily_sales_reports(id) ON DELETE CASCADE,
    note_value int NOT NULL, -- 500, 200, 100, 50, 20, 10, 1
    count int NOT NULL DEFAULT 0,
    total_value numeric(12,2) GENERATED ALWAYS AS (note_value * count) STORED
);

-- Table: dse_expenses
-- Daily expenses claimed by DSE (e.g. Fuel, Food)
CREATE TABLE IF NOT EXISTS dse_expenses (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    report_id bigint REFERENCES daily_sales_reports(id) ON DELETE CASCADE,
    expense_type text, -- 'Food', 'Fuel', 'Other'
    description text,
    amount numeric(10,2) NOT NULL,
    created_at timestamptz DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX idx_dsr_date ON daily_sales_reports(report_date);
CREATE INDEX idx_dsr_dse ON daily_sales_reports(dse_id);
