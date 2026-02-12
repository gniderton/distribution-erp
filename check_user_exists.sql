SELECT id, full_name, email FROM employees WHERE id = 2118977;
SELECT * FROM users WHERE id = 2118977; 
-- Wait, does users table exist?
SELECT table_name FROM information_schema.tables WHERE table_name = 'users';
