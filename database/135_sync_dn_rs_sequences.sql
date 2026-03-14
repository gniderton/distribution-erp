-- Sync DN sequence
UPDATE document_sequences 
SET current_number = (
    SELECT COALESCE(MAX(SUBSTRING(debit_note_number FROM 'GD-CLT-DN-26-(\d+)')::int), 0)
    FROM debit_notes
    WHERE debit_note_number LIKE 'GD-CLT-DN-26-%'
)
WHERE document_type = 'DN';

-- Sync RS sequence
UPDATE document_sequences 
SET current_number = (
    SELECT COALESCE(MAX(SUBSTRING(debit_note_number FROM 'GD-CLT-RS-26-(\d+)')::int), 0)
    FROM debit_notes
    WHERE debit_note_number LIKE 'GD-CLT-RS-26-%'
)
WHERE document_type = 'RS';
