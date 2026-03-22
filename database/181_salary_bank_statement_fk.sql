ALTER TABLE employee_salaries ADD COLUMN IF NOT EXISTS bank_statement_entry_id INTEGER REFERENCES bank_statement_entries(id);
