-- Check if columns exist in view
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'view_customer_ledger';

-- Check if RETURN type is handled in the view definition
SELECT definition 
FROM pg_views 
WHERE viewname = 'view_customer_ledger';
