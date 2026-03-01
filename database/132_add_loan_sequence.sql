-- 132_add_loan_sequence.sql
-- Force insert the LOAN sequence if it doesn't exist, using the correct column names

INSERT INTO document_sequences (document_type, prefix, current_number, description)
SELECT 'LOAN', 'LOAN-', 1, 'Loan Management Sequence'
WHERE NOT EXISTS (
    SELECT 1 FROM document_sequences WHERE document_type = 'LOAN'
);
