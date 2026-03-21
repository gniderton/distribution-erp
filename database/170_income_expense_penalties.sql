-- 170_income_expense_penalties.sql

-- 1. Create Income Penalties Table
CREATE TABLE IF NOT EXISTS income_penalties (
    id BIGSERIAL PRIMARY KEY,
    entity_id BIGINT NOT NULL REFERENCES income_entities(id),
    amount NUMERIC(15, 2) NOT NULL,
    penalty_date DATE NOT NULL DEFAULT CURRENT_DATE,
    penalty_number TEXT UNIQUE,
    cheque_id INTEGER REFERENCES cheques(id),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Expense Penalties Table
CREATE TABLE IF NOT EXISTS expense_penalties (
    id BIGSERIAL PRIMARY KEY,
    entity_id BIGINT NOT NULL REFERENCES expense_entities(id),
    amount NUMERIC(15, 2) NOT NULL,
    penalty_date DATE NOT NULL DEFAULT CURRENT_DATE,
    penalty_number TEXT UNIQUE,
    cheque_id INTEGER REFERENCES cheques(id),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add to document sequences
INSERT INTO document_sequences (document_type, prefix, current_number)
VALUES ('INCOME_PENALTY', 'IPEN-26-', 1), ('EXPENSE_PENALTY', 'EPEN-26-', 1)
ON CONFLICT (document_type) DO NOTHING;
