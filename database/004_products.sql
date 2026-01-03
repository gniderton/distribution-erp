-- Table: products
-- Logic: Central inventory table. Links to all master data tables.
-- Security: RLS enabled.

create table if not exists products (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  vendor_id bigint not null references vendors(id), -- Logic: Single vendor source of truth (for now)
  brand_id bigint references brands(id),
  category_id bigint references categories(id),
  product_code text not null unique, -- Logic: SKU / Internal Code
  product_name text not null,
  ean_code text, -- Logic: Barcode. Kept as text to handle leading zeros or weird formats.
  hsn_id bigint references hsn_codes(id),
  mrp numeric(10,2) not null, -- Logic: Maximum Retail Price
  tax_id bigint references taxes(id),
  
  -- Pricing Logic (Strict Decimal/Numeric types for financial accuracy)
  purchase_rate numeric(10,5) not null, -- High precision for fractional unit costs
  distributor_rate numeric(10,5) default 0,
  wholesale_rate numeric(10,5) default 0,
  dealer_rate numeric(10,5) default 0,
  retail_rate numeric(10,5) default 0,

  is_active boolean default true
);

-- Indexing
create index if not exists idx_products_vendor on products(vendor_id);
create index if not exists idx_products_brand on products(brand_id);
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_name on products(product_name);
create index if not exists idx_products_ean on products(ean_code);

-- Security
alter table products enable row level security;
create policy "Enable functionality for dev" on products for all using (true);
