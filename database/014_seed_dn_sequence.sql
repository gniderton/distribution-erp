-- Seed the DN sequence
INSERT INTO document_sequences (company_settings_id, branch_id, document_type, prefix, current_number)
VALUES (1, 1, 'DN', 'GD-CLT-DN-26-', 0)
ON CONFLICT DO NOTHING; -- Avoid duplicates if run twice
