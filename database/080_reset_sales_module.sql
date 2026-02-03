-- Reset Sales & Scheme Modules
-- Clears Schemes, Orders, Invoices, Deliveries, Payments, and related Accounting
-- Retains Products, Customers, Vendors, Inventory, Purchase Orders

BEGIN;

-- 1. Schemes
--    (scheme_combo_products and scheme_rules cascade from schemes)
TRUNCATE TABLE scheme_combo_products, scheme_rules, schemes RESTART IDENTITY CASCADE;

-- 2. Sales Orders & Invoices & Returns
TRUNCATE TABLE sales_return_lines, sales_returns RESTART IDENTITY CASCADE;
TRUNCATE TABLE sales_invoices RESTART IDENTITY CASCADE;
TRUNCATE TABLE sales_order_lines, sales_orders RESTART IDENTITY CASCADE;

-- 3. Delivery
TRUNCATE TABLE trip_stops, delivery_trips RESTART IDENTITY CASCADE;

-- 4. DSE (Daily Sales Operations)
TRUNCATE TABLE cash_denominations, dse_expenses, daily_sales_reports RESTART IDENTITY CASCADE;

-- 5. Payments
TRUNCATE TABLE customer_payments RESTART IDENTITY CASCADE;

-- 6. Accounting (Specific to Sales)
--    We CANNOT Truncate because GRN/Vendor data might exist.
--    We delete ledger entries related to Sales/Customers.
DELETE FROM journal_lines 
WHERE journal_entry_id IN (
    SELECT id FROM journal_entries 
    WHERE reference_type IN ('INVOICE', 'PAYMENT', 'RETURN', 'SALES_INVOICE', 'SALES_RETURN', 'CUSTOMER_PAYMENT')
);

DELETE FROM journal_entries 
WHERE reference_type IN ('INVOICE', 'PAYMENT', 'RETURN', 'SALES_INVOICE', 'SALES_RETURN', 'CUSTOMER_PAYMENT');

-- Note: We cannot reset journal_entries_id_seq to 1 if other data (GRN) exists.

COMMIT;
