-- Relax GSTIN and PAN limits to handle dirty legacy data
ALTER TABLE customers ALTER COLUMN gstin TYPE text;
ALTER TABLE customers ALTER COLUMN pan TYPE text;
