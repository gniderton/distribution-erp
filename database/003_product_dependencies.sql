-- Transaction: Create Helper Tables for Products
-- Order: Taxes -> HSN -> Brands -> Categories (Independent)

-- 1. Taxes
create table if not exists taxes (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  tax_percentage numeric(5,2) not null,
  tax_type text not null, -- e.g. GST, VAT
  tax_name text not null, -- e.g. 'GST at 5%'
  valid_from date,
  valid_to date,
  is_active boolean default true
);

-- 2. HSN Codes (Depends on Taxes)
create table if not exists hsn_codes (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  hsn_code text not null unique, -- Standard HSN is text
  hsn_description text,
  tax_id bigint references taxes(id), -- Default tax for this HSN
  is_active boolean default true
);

create index if not exists idx_hsn_code on hsn_codes(hsn_code);

-- 3. Brands
create table if not exists brands (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  brand_code text unique, -- Nullable in CSV, but best practice to have code
  brand_name text not null,
  is_active boolean default true
);

create index if not exists idx_brand_name on brands(brand_name);

-- 4. Categories
create table if not exists categories (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  category_code text, -- Nullable in CSV
  category_name text not null,
  is_active boolean default true
);

create index if not exists idx_category_name on categories(category_name);

-- Security: Enable RLS on all
alter table taxes enable row level security;
alter table hsn_codes enable row level security;
alter table brands enable row level security;
alter table categories enable row level security;

-- Dev Policy
create policy "Enable functionality for dev" on taxes for all using (true);
create policy "Enable functionality for dev" on hsn_codes for all using (true);
create policy "Enable functionality for dev" on brands for all using (true);
create policy "Enable functionality for dev" on categories for all using (true);
