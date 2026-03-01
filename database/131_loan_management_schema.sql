-- 131_loan_management_schema.sql
-- Module for tracking Loans Taken and Loans Given

-- 1. Create Loans Table
CREATE TABLE IF NOT EXISTS loans (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    loan_number TEXT UNIQUE NOT NULL, -- Generated via sequence
    loan_type TEXT NOT NULL CHECK (loan_type IN ('TAKEN', 'GIVEN')),
    
    -- Polymorphic Party Tracking
    party_type TEXT NOT NULL CHECK (party_type IN ('EMPLOYEE', 'DIRECTOR', 'BANK', 'FAMILY', 'OTHER')),
    party_id BIGINT, -- Links to employees(id) or other tables if applicable
    party_name TEXT NOT NULL, -- Display name (e.g., 'Axis Bank', 'Director John')
    
    principal_amount NUMERIC(15, 2) NOT NULL CHECK (principal_amount > 0),
    interest_rate_pa NUMERIC(5, 2) DEFAULT 0 CHECK (interest_rate_pa >= 0), -- Annual interest rate %
    tenor_months INTEGER NOT NULL CHECK (tenor_months > 0),
    emi_amount NUMERIC(15, 2) DEFAULT 0,
    
    disbursement_date DATE NOT NULL,
    start_date DATE NOT NULL,
    
    balance_principal NUMERIC(15, 2) NOT NULL,
    balance_interest NUMERIC(15, 2) DEFAULT 0,
    
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Closed', 'Defaulted')),
    remarks TEXT,
    created_by INTEGER -- User ID who recorded the loan
);

-- 2. Create Loan Transactions Table
CREATE TABLE IF NOT EXISTS loan_transactions (
    id BIGSERIAL PRIMARY KEY,
    loan_id BIGINT REFERENCES loans(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    
    amount NUMERIC(15, 2) NOT NULL,
    principal_portion NUMERIC(15, 2) DEFAULT 0,
    interest_portion NUMERIC(15, 2) DEFAULT 0,
    
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('DISBURSEMENT', 'INSTALLMENT', 'INTEREST_ACCRUAL', 'WAIVER', 'OTHER')),
    payment_mode TEXT NOT NULL, -- 'CASH', 'ONLINE', 'CHEQUE'
    reference_no TEXT,
    bank_statement_entry_id BIGINT, -- For automatic recon
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    remarks TEXT
);

-- 3. Seed COA Accounts
INSERT INTO chart_of_accounts (code, name, type) VALUES
(1105, 'Loans & Advances (Receivable)', 'ASSET'),
(2101, 'Loans & Borrowings (Payable)', 'LIABILITY'),
(4101, 'Interest Income', 'INCOME'),
(5101, 'Interest Expense', 'EXPENSE')
ON CONFLICT (code) DO NOTHING;

-- 4. Setup Document Sequence
INSERT INTO document_sequences (prefix, next_val, description) 
VALUES ('LOAN-', 1, 'Loan Management Sequence')
ON CONFLICT (prefix) DO NOTHING;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_loans_party ON loans(party_type, party_id);
CREATE INDEX IF NOT EXISTS idx_loan_transactions_loan ON loan_transactions(loan_id);
