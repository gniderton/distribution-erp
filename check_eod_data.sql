-- Check Daily Sales Reports (use submitted_at)
SELECT * FROM daily_sales_reports ORDER BY submitted_at DESC LIMIT 1;

-- Check Denominations
SELECT * FROM cash_denominations ORDER BY created_at DESC LIMIT 1;

-- Check Expenses
SELECT * FROM dse_expenses ORDER BY created_at DESC LIMIT 5;

-- Check Payments (Recent)
SELECT * FROM customer_payments ORDER BY payment_date DESC LIMIT 5;
