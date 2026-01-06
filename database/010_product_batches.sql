-- Phase 3: Advanced Inventory (FIFO / Batches)

-- 1. Product Batches Table
-- Logic: Tracks actual inventory chunks.
-- FIFO Strategy: Sort by expiry_date ASC, then received_date ASC.
create table if not exists product_batches (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  
  -- Links
  product_id bigint not null references products(id),
  purchase_invoice_line_id bigint references purchase_invoice_lines(id), -- Traceability
  
  -- Batch Details
  batch_number text default 'DEFAULT', -- E.g. "B-001" or empty
  mrp numeric(10, 2) not null, -- Defines the "Variant" of the stock
  expiry_date date,
  received_date date not null default CURRENT_DATE, -- Critical for FIFO
  
  -- Pricing (Specific to this Lot)
  purchase_rate numeric(12, 5) not null,
  sale_rate numeric(12, 5), -- Optional batch-specific selling price
  
  -- Quantity Management
  initial_qty numeric(12, 3) not null, -- History
  current_qty numeric(12, 3) not null, -- LIVE STOCK
  
  -- Status
  is_active boolean default true -- Set to false when current_qty = 0
);

-- Indexes for Speed (Critical for Sales Queries)
create index if not exists idx_batches_product on product_batches(product_id);
create index if not exists idx_batches_fifo on product_batches(product_id, expiry_date, received_date);
create index if not exists idx_batches_active on product_batches(is_active);

-- Security
alter table product_batches enable row level security;
create policy "Enable all for dev" on product_batches for all using (true);
