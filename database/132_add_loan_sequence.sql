-- 132_add_loan_sequence.sql
-- Force insert the LOAN sequence if it doesn't exist, using ONLY existing standard columns

INSERT INTO document_sequences (document_type, prefix, current_number)
VALUES ('LOAN', 'LOAN-', 1)
ON CONFLICT (document_type) DO NOTHING;
