-- 138. Add Tier Applied to Invoice Lines
-- Logic: Stores the promotional scheme description (e.g. "Buy X Get Y") directly on the invoice line for historical accuracy.

ALTER TABLE sales_invoice_lines ADD COLUMN tier_applied TEXT;
