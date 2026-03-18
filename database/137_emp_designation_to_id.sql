-- 1. Explicitly map 'DSE' to ID 14 (if any employees have 'DSE' as text)
UPDATE employees e
SET designation = '14'
WHERE e.designation ILIKE 'DSE';

-- 2. Ensure other text designations exist in the designations table
INSERT INTO designations (title, code, department)
SELECT DISTINCT designation, SUBSTRING(UPPER(REPLACE(designation, ' ', '')), 1, 3), 'General'
FROM employees 
WHERE designation ~ '^[A-Za-z \-]+$' -- Only textual titles
  AND NOT EXISTS (
      SELECT 1 FROM designations d WHERE d.title = employees.designation
  );

-- 3. Map remaining text designations to their corresponding IDs
UPDATE employees e
SET designation = d.id::text
FROM designations d
WHERE e.designation = d.title
  AND e.designation ~ '^[A-Za-z \-]+$';

-- 4. Alter column to proper foreign key
ALTER TABLE employees 
  ALTER COLUMN designation TYPE bigint USING designation::bigint,
  ADD CONSTRAINT fk_emp_designation FOREIGN KEY (designation) REFERENCES designations(id);
