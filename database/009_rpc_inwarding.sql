-- Phase 3: Inwarding Logic (With Batches & Buckets)

-- 1. Helper: Ensure columns exist (Idempotent)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'current_stock') THEN 
        ALTER TABLE products ADD COLUMN current_stock numeric(12, 3) DEFAULT 0; 
    END IF; 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'damaged_stock') THEN 
        ALTER TABLE products ADD COLUMN damaged_stock numeric(12, 3) DEFAULT 0; 
    END IF; 
END $$;

-- 2. RPC: Create Purchase Invoice (Buckets V3, Traceability V4)
create or replace function create_purchase_invoice(
  p_vendor_id bigint,
  p_po_id bigint, -- Nullable
  p_invoice_no text, -- Vendor's Bill No
  p_invoice_date date,
  p_received_date date,
  p_total_net numeric,
  p_tax_amount numeric,
  p_grand_total numeric,
  p_lines jsonb,
  p_parent_id bigint default null -- Traceability: Link to Old GRN
)
returns json as $$
declare
  v_pi_id bigint;
  v_pi_number text;
  v_prefix text;
  v_next_val bigint;
  line_item jsonb;
  v_line_id bigint;
  v_batch_no text;
  v_expiry date;
begin
  -- A. Get Next 'PI' Sequence
  select prefix, current_number + 1 into v_prefix, v_next_val
  -- 1. Auto-Generate Internal ID (Sequence Logic)
  UPDATE document_sequences 
  SET current_number = current_number + 1
  WHERE document_type = 'PI'
  RETURNING current_number INTO v_seq_num;
  
  -- Fallback if sequence doesn't exist
  IF v_seq_num IS NULL THEN
     INSERT INTO document_sequences (company_settings_id, branch_id, document_type, prefix, current_number)
     VALUES (1, 1, 'PI', 'PI', 1)
     RETURNING current_number INTO v_seq_num;
  END IF;
  
  v_internal_id := 'PI-' || v_seq_num;

  -- 2. Insert Header
  INSERT INTO purchase_invoice_headers (
      vendor_id, purchase_order_id, 
      invoice_number, -- Internal System ID
      vendor_invoice_number, -- Their Bill No
      vendor_invoice_date, received_date,
      total_net, tax_amount, grand_total, status,
      parent_invoice_id,
      created_by
  )
  VALUES (
      p_vendor_id, 
      (CASE WHEN p_po_id = 0 THEN NULL ELSE p_po_id END), 
      v_internal_id, -- Auto-Generated
      p_invoice_number, -- User Input (Vendor Bill No)
      p_invoice_date, 
      p_received_date,
      p_total_net, p_tax_amount, p_grand_total, 'Verified',
      p_parent_id,
      1 -- Assuming a default created_by user for now
  )
  RETURNING id INTO v_pi_id;

  -- 3. Process Lines
  for v_line in select * from jsonb_array_elements(p_lines_json)
  loop
    -- 1. Insert Invoice Line
    insert into purchase_invoice_lines (
      purchase_invoice_header_id, product_id,
      ordered_qty, accepted_qty, rejected_qty,
      rate, discount_percent, scheme_amount, tax_amount, amount
    ) values (
      v_pi_id, (line_item->>'product_id')::bigint,
      (line_item->>'ordered_qty')::numeric,
      (line_item->>'accepted_qty')::numeric,
      (line_item->>'rejected_qty')::numeric,
       (line_item->>'rate')::numeric,
       (line_item->>'discount_percent')::numeric,
       (line_item->>'scheme_amount')::numeric,
       (line_item->>'tax_amount')::numeric,
       (line_item->>'amount')::numeric
    ) returning id into v_line_id;

    -- 2. CREATE BATCH (Stock Buckets)
    v_batch_no := coalesce(line_item->>'batch_number', 'DEFAULT');
    if (line_item->>'expiry_date') = '' then 
       v_expiry := null;
    else 
       v_expiry := (line_item->>'expiry_date')::date;
    end if;

    -- Create Batch
    INSERT INTO product_batches (
        product_id, purchase_invoice_line_id, batch_number,
        mrp, expiry_date, received_date,
        purchase_rate, qty_good, initial_qty, is_active
    )
    VALUES (
        (line_item->>'product_id')::bigint, v_line_id, v_batch_no,
        (line_item->>'mrp')::numeric, v_expiry, p_received_date,
        (line_item->>'rate')::numeric, (line_item->>'accepted_qty')::numeric, (line_item->>'accepted_qty')::numeric, true
    );

    -- 3. UPDATE PRODUCT SUMMARY (Double Update)
    update products 
    set current_stock = (select sum(qty_good) from product_batches where product_id = (line_item->>'product_id')::bigint),
        damaged_stock = (select sum(qty_damaged) from product_batches where product_id = (line_item->>'product_id')::bigint)
    where id = (line_item->>'product_id')::bigint;
    
  end loop;

  -- D. Update Sequence
  update document_sequences set current_number = v_next_val where document_type = 'PI';

  return json_build_object('success', true, 'pi_number', v_pi_number, 'id', v_pi_id);
end;
$$ language plpgsql;
