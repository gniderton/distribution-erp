-- Table: vendors
-- Logic: Stores supplier/vendor master data.
-- Security: 
-- 1. RLS (Row Level Security) enabled to prepare for multi-tenant or role-based access.
-- 2. Strict typing (VARCHAR length constraints) to prevent data anomalies.

create table if not exists vendors (
  id bigint primary key generated always as identity, -- logical increment: strictly typed unique identifier
  created_at timestamptz default now() not null, -- logic: tracks record lifecycle, prefers timestamptz over raw epoch for readability
  vendor_code text not null unique, -- logic: business key, must be unique to prevent dupes (e.g. 'GD-CLT-1')
  vendor_name text not null, -- logic: display name
  contact_person text, -- logic: operational poc
  contact_no text, -- logic: text type prevents loss of specific formatting or leading zeros
  contact_no_2 text,
  email text check (email ~* '^.+@.+\..+$'), -- logic: basic regex validation for data integrity
  gst varchar(15), -- logic: strict 15 char limit for Indian GST
  branch_id bigint default 0, -- logic: multi-branch support placeholder
  is_active boolean default false, -- logic: security first - vendors inactive by default until approved
  vendor_address_id bigint -- logic: relational link to future 'addresses' table
);

-- Indexing for Performance
create index if not exists idx_vendors_name on vendors(vendor_name);
create index if not exists idx_vendors_gst on vendors(gst);

-- Security: Enable RLS
alter table vendors enable row level security;

-- Policy (Placeholder): Allow all for now during dev, strictly lock down later
create policy "Enable functionality for dev" on vendors for all using (true);
