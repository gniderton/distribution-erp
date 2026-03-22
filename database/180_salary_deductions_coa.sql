INSERT INTO chart_of_accounts (code, name, type) 
VALUES (5011, 'Salary Deductions (Contra-Expense)', 'EXPENSE') 
ON CONFLICT (code) DO NOTHING;
