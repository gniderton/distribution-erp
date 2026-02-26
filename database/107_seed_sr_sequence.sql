-- Seed Document Sequence for Sales Returns (SR)
INSERT INTO document_sequences (document_type, prefix, current_number, is_active)
SELECT 'SR', 'GD-SR-26-', 0, true
WHERE NOT EXISTS (
    SELECT 1 FROM document_sequences WHERE document_type = 'SR'
);
