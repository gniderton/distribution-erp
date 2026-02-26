INSERT INTO chart_of_accounts (code, name, type) VALUES 
(5010, 'Fuel Expense', 'EXPENSE'), 
(5011, 'Food & Transit', 'EXPENSE'), 
(5012, 'Vehicle Repair', 'EXPENSE'), 
(5013, 'Misc DSE Expense', 'EXPENSE') 
ON CONFLICT (code) DO NOTHING;
