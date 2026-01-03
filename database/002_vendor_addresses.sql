-- Table: vendor_addresses
-- Logic: Stores physical locations for vendors (Billing, Shipping, etc.).
-- Relationships: Many-to-One with 'vendors' table.

create table if not exists vendor_addresses (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  vendor_id bigint not null references vendors(id) on delete cascade, -- logic: cascade delete removes addresses if vendor is deleted
  address_type_id bigint default 1, -- logic: placeholder for type (1=Billing, 2=Shipping, etc.)
  address_line text not null, -- logic: normalized from 'Addres_Line'
  coordinates text, -- logic: placeholder for lat/long
  area text,
  district text,
  city text,
  state_code text, -- logic: normalized from 'State' (e.g. '32' for Kerala), kept as text to preserve leading formatting if needed
  pin_code text check (length(pin_code) >= 6), -- logic: basic validation for indian pincodes
  is_default boolean default false, -- logic: marks the primary address for the vendor
  is_active boolean default true
);

-- Indexing
create index if not exists idx_vendor_addresses_vendor_id on vendor_addresses(vendor_id);
create index if not exists idx_vendor_addresses_pincode on vendor_addresses(pin_code);

-- Security: Enable RLS
alter table vendor_addresses enable row level security;

-- Policy (Placeholder)
create policy "Enable functionality for dev" on vendor_addresses for all using (true);
