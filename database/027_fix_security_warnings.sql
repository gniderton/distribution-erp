-- Fix 1: Enable RLS on newly created 'master_banks' table
ALTER TABLE master_banks ENABLE ROW LEVEL SECURITY;

-- Add Dev Policy (matches other tables)
DROP POLICY IF EXISTS "Enable all access for dev" ON master_banks;
CREATE POLICY "Enable all access for dev" ON master_banks FOR ALL USING (true) WITH CHECK (true);

-- Fix 2: Secure RPC Functions
-- Must use EXACT signatures as defined in the DB

-- create_purchase_invoice (Defined in 009_rpc_inwarding.sql)
ALTER FUNCTION create_purchase_invoice(
  p_vendor_id bigint,
  p_po_id bigint,
  p_invoice_no text,
  p_invoice_date date,
  p_received_date date,
  p_total_net numeric,
  p_tax_amount numeric,
  p_grand_total numeric,
  p_lines jsonb
) SET search_path = public;

-- create_purchase_order (Defined in 006_rpc_create_po.sql)
ALTER FUNCTION create_purchase_order(
    p_vendor_id INT,
    p_total_net NUMERIC,
    p_total_qty NUMERIC,
    p_gst NUMERIC,
    p_total_taxable NUMERIC,
    p_total_scheme NUMERIC,
    p_total_disc NUMERIC,
    p_remarks TEXT,
    p_lines JSONB
) SET search_path = public;

-- update_purchase_order (Defined in 007_rpc_update_po.sql)
ALTER FUNCTION update_purchase_order(
    p_header_id INT,
    p_vendor_id INT,
    p_total_net NUMERIC,
    p_total_qty NUMERIC,
    p_gst NUMERIC,
    p_total_taxable NUMERIC,
    p_total_scheme NUMERIC,
    p_total_disc NUMERIC,
    p_remarks TEXT,
    p_lines JSONB
) SET search_path = public;
