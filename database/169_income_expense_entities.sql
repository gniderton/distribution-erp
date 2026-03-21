-- 169_income_expense_entities.sql

-- 1. Create Income Entities Table
CREATE TABLE IF NOT EXISTS income_entities (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    gst_no TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Expense Entities Table
CREATE TABLE IF NOT EXISTS expense_entities (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    gst_no TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Modify Other Income: Rename and Retype received_from
-- First clear existing text to allow conversion to BIGINT
UPDATE other_income SET received_from = NULL; 
ALTER TABLE other_income RENAME COLUMN received_from TO entity_id;
ALTER TABLE other_income ALTER COLUMN entity_id TYPE BIGINT USING entity_id::BIGINT;
ALTER TABLE other_income ADD CONSTRAINT fk_other_income_entity FOREIGN KEY (entity_id) REFERENCES income_entities(id);

-- 4. Modify Expenses: Rename and Retype vendor_name
-- First clear existing text
UPDATE expenses SET vendor_name = NULL;
ALTER TABLE expenses RENAME COLUMN vendor_name TO entity_id;
ALTER TABLE expenses ALTER COLUMN entity_id TYPE BIGINT USING entity_id::BIGINT;
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_entity FOREIGN KEY (entity_id) REFERENCES expense_entities(id);

-- 5. Add specific sequence for Penalty Documents if not exists
INSERT INTO document_sequences (document_type, prefix, current_number)
VALUES ('INCOME_PENALTY', 'IPEN-26-', 1)
ON CONFLICT (document_type) DO NOTHING;
