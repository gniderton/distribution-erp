-- Table: vehicles
create table if not exists vehicles (
    id bigint primary key generated always as identity,
    vehicle_number text unique not null,
    vehicle_type text, -- e.g. TATA Ace, Pickup
    is_active boolean default true
);

-- Table: delivery_trips
create table if not exists delivery_trips (
    id bigint primary key generated always as identity,
    created_at timestamptz default now() not null,
    
    trip_number text unique not null,
    trip_date date not null default current_date,
    
    vehicle_id bigint references vehicles(id),
    driver_id bigint references employees(id), -- Employee with role 'Driver'
    helper_id bigint references employees(id),
    
    status text default 'Planned' check (status in ('Planned', 'In Transit', 'Completed', 'Cancelled')),
    
    start_kms numeric(12,2),
    end_kms numeric(12,2),
    start_time timestamptz,
    end_time timestamptz,
    
    notes text
);

-- Table: trip_stops
create table if not exists trip_stops (
    id bigint primary key generated always as identity,
    trip_id bigint not null references delivery_trips(id) on delete cascade,
    invoice_id bigint not null references sales_invoices(id),
    
    sequence_no integer default 0,
    status text default 'Pending' check (status in ('Pending', 'Delivered', 'Partially Delivered', 'Rejected', 'Return to Base')),
    
    delivered_at timestamptz,
    delivery_lat numeric(10, 7),
    delivery_lng numeric(10, 7),
    
    rejection_reason text,
    is_active boolean default true
);

-- Indexes
create index if not exists idx_trip_driver on delivery_trips(driver_id);
create index if not exists idx_trip_status on delivery_trips(status);
create index if not exists idx_stop_trip on trip_stops(trip_id);
create index if not exists idx_stop_inv on trip_stops(invoice_id);

-- RLS
alter table vehicles enable row level security;
alter table delivery_trips enable row level security;
alter table trip_stops enable row level security;

drop policy if exists "Enable access for dev" on vehicles;
drop policy if exists "Enable access for dev" on delivery_trips;
drop policy if exists "Enable access for dev" on trip_stops;

create policy "Enable access for dev" on vehicles for all using (true);
create policy "Enable access for dev" on delivery_trips for all using (true);
create policy "Enable access for dev" on trip_stops for all using (true);
