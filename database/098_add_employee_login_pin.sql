-- Add login_pin to employees for Mobile App Auth
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS login_pin text;

-- Set default PIN for existing active employees (Default: 1234)
UPDATE employees 
SET login_pin = '1234' 
WHERE is_active = true AND login_pin IS NULL;
