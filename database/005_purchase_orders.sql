-- Phase 2: Purchase Order Logic

-- 1. Document Sequences
-- Logic: Manages running numbers for POs (e.g. PO-001, PO-002) to prevent gaps/duplicates.
create table if not exists document_sequences (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  company_settings_id bigint default 1,
  branch_id bigint default 1,
  document_type text not null, -- e.g. 'PO'
  prefix text not null, -- e.g. 'GD-CLT-PO-26-'
  current_number bigint default 0,
  is_active boolean default true
);

-- 2. Purchase Order Headers
create table if not exists purchase_order_headers (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  po_number text not null unique, -- Generated from sequence
  po_date timestamptz default now(),
  vendor_id bigint references vendors(id),
  status text default 'Draft', -- Draft, Approved, Cancelled
  
  -- Financials (Strict Numeric)
  total_qty numeric(12, 3) default 0,
  total_net numeric(15, 2) default 0, -- Total before tax
  total_taxable numeric(15, 2) default 0,
  gst numeric(15, 2) default 0, -- Total Tax Amount
  total_excise numeric(15, 2) default 0,
  total_disc numeric(15, 2) default 0,
  total_scheme numeric(15, 2) default 0,
  grand_total numeric(15, 2) default 0, -- Final Amount (Net + Tax)
  
  remarks text,
  created_by bigint -- User ID placeholder
);

create index if not exists idx_po_headers_vendor on purchase_order_headers(vendor_id);
create index if not exists idx_po_headers_number on purchase_order_headers(po_number);

-- 3. Purchase Order Lines
create table if not exists purchase_order_lines (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  purchase_order_header_id bigint not null references purchase_order_headers(id) on delete cascade,
  product_id bigint references products(id),
  product_name text, -- Snapshot name in case product master changes
  
  -- Line Details
  ordered_qty numeric(12, 3) default 0,
  mrp numeric(10, 2) default 0,
  rate numeric(12, 5) default 0, -- Unit Price
  
  -- Line Calculations
  discount_percent numeric(5, 2) default 0,
  scheme_amount numeric(10, 2) default 0,
  tax_amount numeric(10, 2) default 0,
  amount numeric(15, 2) default 0 -- Line Total
);

create index if not exists idx_po_lines_header on purchase_order_lines(purchase_order_header_id);
create index if not exists idx_po_lines_product on purchase_order_lines(product_id);

-- Security
alter table document_sequences enable row level security;
alter table purchase_order_headers enable row level security;
alter table purchase_order_lines enable row level security;

create policy "Enable functionality for dev" on document_sequences for all using (true);
create policy "Enable functionality for dev" on purchase_order_headers for all using (true);
create policy "Enable functionality for dev" on purchase_order_lines for all using (true);
