-- Create a sequence for Sales Orders
INSERT INTO document_sequences (document_type, prefix, current_value, padding_length)
VALUES ('Sales Order', 'SO', 0, 5)
ON CONFLICT (document_type) DO NOTHING;
