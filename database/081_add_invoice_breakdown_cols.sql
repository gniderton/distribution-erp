-- Add breakdown columns to sales_invoice_lines to support User's Invoice Structure
-- Structure: Gross - Scheme - Discount = Taxable

ALTER TABLE sales_invoice_lines
ADD COLUMN gross_amount NUMERIC(12,2) DEFAULT 0,    -- (Qty * Rate)
ADD COLUMN scheme_amount NUMERIC(12,2) DEFAULT 0,   -- Deduction for Free Items / Price Diff
ADD COLUMN discount_percent NUMERIC(5,2) DEFAULT 0, -- User Requested %
ADD COLUMN discount_amount NUMERIC(12,2) DEFAULT 0, -- Value of Discount
ADD COLUMN taxable_amount NUMERIC(12,2) DEFAULT 0;  -- The final amount tax is calculated on

-- Update existing rows to have sensible defaults (assume backward compatibility)
UPDATE sales_invoice_lines 
SET 
    gross_amount = amount / (1 + (tax_percent/100)),
    taxable_amount = amount / (1 + (tax_percent/100)),
    scheme_amount = 0,
    discount_percent = 0,
    discount_amount = 0
WHERE gross_amount = 0;
