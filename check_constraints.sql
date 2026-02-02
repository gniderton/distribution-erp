SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'sales_orders'::regclass
AND contype = 'c';
