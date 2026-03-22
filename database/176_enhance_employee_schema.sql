-- 176_enhance_employee_schema.sql

-- 1. Clean up bloated/redundant columns
ALTER TABLE employees DROP COLUMN IF EXISTS current_salary;
ALTER TABLE employees DROP COLUMN IF EXISTS designation_id;

-- 2. Normalize and Rename Designation
-- First ensure existing string IDs can be converted
ALTER TABLE employees ALTER COLUMN designation TYPE BIGINT USING designation::BIGINT;
ALTER TABLE employees RENAME COLUMN designation TO designation_id;
ALTER TABLE employees ADD CONSTRAINT fk_employee_designation FOREIGN KEY (designation_id) REFERENCES designations(id);

-- 3. Standardize Naming (Remove bloat/inconsistency)
ALTER TABLE employees RENAME COLUMN address_full TO address;
ALTER TABLE employees RENAME COLUMN aadhar_number TO aadhar_no;
ALTER TABLE employees RENAME COLUMN driving_license_number TO license_no;
ALTER TABLE employees RENAME COLUMN account_number TO account_no;

-- 4. Ensure EMPLOYEE sequence exists
INSERT INTO document_sequences (document_type, prefix, current_number)
VALUES ('EMPLOYEE', 'EM-', 1)
ON CONFLICT (document_type) DO NOTHING;

-- 5. Enhanced View for Frontend
CREATE OR REPLACE VIEW view_employee_details AS
SELECT 
    e.*,
    d.title as designation_name,
    d.department as department_name,
    sh.new_salary as current_salary
FROM employees e
LEFT JOIN designations d ON e.designation_id = d.id
LEFT JOIN LATERAL (
    SELECT new_salary 
    FROM employee_salary_history 
    WHERE employee_id = e.id 
    ORDER BY effective_date DESC, created_at DESC 
    LIMIT 1
) sh ON true;
