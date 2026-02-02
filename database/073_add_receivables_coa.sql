INSERT INTO chart_of_accounts (code, name, type) 
VALUES (1101, 'Accounts Receivable', 'ASSET')
ON CONFLICT (code) DO NOTHING;
