-- Create a sequence for Sales Orders (Corrected)
INSERT INTO document_sequences (document_type, prefix, current_number)
VALUES ('Sales Order', 'SO', 0)
ON CONFLICT (document_type) DO NOTHING;
