-- WARN: Dropping existing tables to fix schema mismatch
DROP TABLE IF EXISTS dse_expenses CASCADE;
DROP TABLE IF EXISTS cash_denominations CASCADE;
DROP TABLE IF EXISTS daily_sales_reports CASCADE;

-- 1. DSE Expenses Table
CREATE TABLE dse_expenses (
    id BIGSERIAL PRIMARY KEY,
    dse_id BIGINT REFERENCES employees(id),
    expense_date DATE DEFAULT CURRENT_DATE,
    expense_type VARCHAR(50), -- 'Fuel', 'Food', 'Repair', 'Other'
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Cash Denominations Table
CREATE TABLE cash_denominations (
    id BIGSERIAL PRIMARY KEY,
    dse_id BIGINT REFERENCES employees(id),
    report_date DATE DEFAULT CURRENT_DATE,
    note_500 INT DEFAULT 0,
    note_200 INT DEFAULT 0,
    note_100 INT DEFAULT 0,
    note_50 INT DEFAULT 0,
    note_20 INT DEFAULT 0,
    note_10 INT DEFAULT 0,
    coins INT DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL, -- Calculated total
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Daily Sales Report (Master Record for the Day)
CREATE TABLE daily_sales_reports (
    id BIGSERIAL PRIMARY KEY,
    dse_id BIGINT REFERENCES employees(id),
    report_date DATE DEFAULT CURRENT_DATE,
    
    -- Metrics
    total_orders INT DEFAULT 0,
    total_order_value DECIMAL(12, 2) DEFAULT 0,
    
    total_collection_cash DECIMAL(12, 2) DEFAULT 0,
    total_collection_cheque DECIMAL(12, 2) DEFAULT 0,
    total_collection_online DECIMAL(12, 2) DEFAULT 0,
    
    total_expense DECIMAL(10, 2) DEFAULT 0,
    
    -- Status
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by BIGINT REFERENCES employees(id), -- Admin who verified
    submitted_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(dse_id, report_date) -- One report per DSE per day
);
