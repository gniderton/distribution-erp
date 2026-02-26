-- Phase 111: Seed Expense Sequence
INSERT INTO document_sequences (document_type, prefix, current_number, is_active)
SELECT 'EXPENSE', 'EXP-', 0, true
WHERE NOT EXISTS (SELECT 1 FROM document_sequences WHERE document_type = 'EXPENSE');

-- Add expense_number column to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_number TEXT UNIQUE;
