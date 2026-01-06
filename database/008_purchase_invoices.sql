-- Phase 3: Purchase Entry (Inwarding / GRN)

-- 1. Headers Table
create table if not exists purchase_invoice_headers (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  
  -- Document Info
  invoice_number text not null unique, -- Our Internal Sequence (e.g. PI-001)
  vendor_invoice_number text, -- Their Bill No
  vendor_invoice_date date, -- Their Bill Date
  received_date date default CURRENT_DATE, -- Stock Entry Date
  
  -- Links
  vendor_id bigint not null references vendors(id),
  purchase_order_id bigint references purchase_order_headers(id), -- Optional Link
  
  -- Status
  status text default 'Draft', -- Draft, Verified (Stock Added), Cancelled
  
  -- Financials
  total_net numeric(15, 2) default 0,
  tax_amount numeric(15, 2) default 0,
  grand_total numeric(15, 2) default 0,
  
  remarks text,
  created_by bigint
);

create index if not exists idx_pi_vendor on purchase_invoice_headers(vendor_id);
create index if not exists idx_pi_po on purchase_invoice_headers(purchase_order_id);
create index if not exists idx_pi_number on purchase_invoice_headers(invoice_number);

-- 2. Lines Table
create table if not exists purchase_invoice_lines (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  purchase_invoice_header_id bigint not null references purchase_invoice_headers(id) on delete cascade,
  product_id bigint not null references products(id),
  
  -- Qty Logic
  ordered_qty numeric(12, 3) default 0, -- Reference from PO
  accepted_qty numeric(12, 3) not null, -- ACTUAL STOCK ADDED
  rejected_qty numeric(12, 3) default 0, -- For Reference
  
  -- Financials (Actual Billed Rates)
  rate numeric(12, 5) not null,
  discount_percent numeric(5, 2) default 0,
  scheme_amount numeric(10, 2) default 0,
  tax_amount numeric(10, 2) default 0,
  amount numeric(15, 2) default 0
);

create index if not exists idx_pi_lines_header on purchase_invoice_lines(purchase_invoice_header_id);
create index if not exists idx_pi_lines_product on purchase_invoice_lines(product_id);

-- 3. Security
alter table purchase_invoice_headers enable row level security;
alter table purchase_invoice_lines enable row level security;

create policy "Enable all for dev" on purchase_invoice_headers for all using (true);
create policy "Enable all for dev" on purchase_invoice_lines for all using (true);
