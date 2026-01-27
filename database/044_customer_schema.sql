-- Table: routes
-- Logic: Generic routes (e.g., 'Monday Route', 'Calicut North'). Not tied to DSE.
create table if not exists routes (
    id bigint primary key generated always as identity,
    created_at timestamptz default now() not null,
    
    route_name text not null unique,
    description text,
    is_active boolean default true
);

-- Table: customers
-- Logic: The buyer. Linked to a Route and an Assigned DSE (Salesperson).
create table if not exists customers (
    id bigint primary key generated always as identity,
    created_at timestamptz default now() not null,
    
    customer_name text not null,
    customer_phone text,
    email text,
    
    gstin varchar(15),
    pan varchar(10), -- Derived logic usually, but stored for reference
    
    credit_limit numeric(12,2) default 0,
    credit_days integer default 0,
    
    default_price_tier text default 'Dealer' check (default_price_tier in ('Dealer', 'Wholesale', 'Retail', 'Distributor')),
    
    -- Logistics Links
    route_id bigint references routes(id),
    dse_id bigint references employees(id), -- The assigned DSE for this customer
    
    is_active boolean default true
);

create index if not exists idx_cust_route on customers(route_id);
create index if not exists idx_cust_dse on customers(dse_id);
create index if not exists idx_cust_gst on customers(gstin);

-- Table: customer_addresses
-- Logic: Multiple addresses per customer (Billing vs Shipping)
create table if not exists customer_addresses (
    id bigint primary key generated always as identity,
    customer_id bigint not null references customers(id) on delete cascade,
    
    address_line1 text,
    address_line2 text,
    city text,
    state text default 'Kerala',
    pincode text,
    
    is_default_billing boolean default false,
    is_default_shipping boolean default false
);

create index if not exists idx_addr_cust on customer_addresses(customer_id);

-- Table: customer_brand_pricing
-- Logic: Pricing Exceptions. "Customer A gets Wholesale Rate for Brand X".
create table if not exists customer_brand_pricing (
    id bigint primary key generated always as identity,
    customer_id bigint not null references customers(id) on delete cascade,
    
    brand_id bigint not null references brands(id) on delete cascade,
    price_tier text not null check (price_tier in ('Dealer', 'Wholesale', 'Retail', 'Distributor')),
    
    unique(customer_id, brand_id) -- Prevent conflicting rules
);

-- RLS
alter table routes enable row level security;
alter table customers enable row level security;
alter table customer_addresses enable row level security;
alter table customer_brand_pricing enable row level security;

drop policy if exists "Enable access for dev" on routes;
create policy "Enable access for dev" on routes for all using (true);

drop policy if exists "Enable access for dev" on customers;
create policy "Enable access for dev" on customers for all using (true);

drop policy if exists "Enable access for dev" on customer_addresses;
create policy "Enable access for dev" on customer_addresses for all using (true);

drop policy if exists "Enable access for dev" on customer_brand_pricing;
create policy "Enable access for dev" on customer_brand_pricing for all using (true);
