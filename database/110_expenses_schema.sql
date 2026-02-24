-- Phase 110: Expenses Portal Schema
-- 1. Refine Chart of Accounts
INSERT INTO chart_of_accounts (code, name, type) VALUES
(5101, 'Rent Expense', 'EXPENSE'),
(5103, 'Utilities Expense', 'EXPENSE'),
(5104, 'Logistics & Delivery Expense', 'EXPENSE'),
(5105, 'Marketing & Promotion Expense', 'EXPENSE'),
(5201, 'Interest Expense', 'EXPENSE'),
(5202, 'Bank Charges', 'EXPENSE')
ON CONFLICT (code) DO NOTHING;

-- 2. Create Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Links to Accounting
    category_account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
    payment_source_id INTEGER NOT NULL REFERENCES bank_accounts(id),
    journal_entry_id BIGINT REFERENCES journal_entries(id),
    
    -- Amount Details
    taxable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    is_gst_expense BOOLEAN DEFAULT FALSE,
    
    -- Vendor/Bill Details
    vendor_name TEXT,
    bill_no TEXT,
    gst_no TEXT,
    description TEXT,
    reference_no TEXT, -- Cheque or Transaction ID
    
    -- Metadata
    created_by BIGINT REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexing for portal performance
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_account_id);
CREATE INDEX idx_expenses_source ON expenses(payment_source_id);
