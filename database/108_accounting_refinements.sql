-- Phase 108: Accounting Refinements
-- Add Sales Returns account to COA
INSERT INTO chart_of_accounts (code, name, type) 
VALUES (4003, 'Sales Returns', 'INCOME')
ON CONFLICT (code) DO NOTHING;
