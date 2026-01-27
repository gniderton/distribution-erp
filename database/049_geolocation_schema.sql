-- Table: customer_visits
-- Logic: Logs physical DSE presence at customer site (Check-In)
create table if not exists customer_visits (
    id bigint primary key generated always as identity,
    created_at timestamptz default now() not null,
    
    customer_id bigint not null references customers(id),
    dse_id bigint not null references employees(id),
    
    visit_date date not null default current_date,
    visit_type text default 'CheckIn' check (visit_type in ('CheckIn', 'Order', 'Payment', 'NoReview')),
    
    location_lat numeric(10, 7),
    location_lng numeric(10, 7),
    
    notes text -- e.g. "Shop closed", "Owner not available"
);

create index if not exists idx_visit_dse on customer_visits(dse_id);
create index if not exists idx_visit_cust on customer_visits(customer_id);

-- Alter: sales_orders
-- Logic: Store GPS where order was taken
alter table sales_orders 
    add column if not exists location_lat numeric(10, 7),
    add column if not exists location_lng numeric(10, 7);

-- Alter: customer_payments
-- Logic: Store GPS where payment was collected
alter table customer_payments
    add column if not exists location_lat numeric(10, 7),
    add column if not exists location_lng numeric(10, 7);

-- RLS
alter table customer_visits enable row level security;
drop policy if exists "Enable access for dev" on customer_visits;
create policy "Enable access for dev" on customer_visits for all using (true);
