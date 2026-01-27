-- Table: sales_orders
-- Logic: The commitment to sell. Created by DSE or Admin.
create table if not exists sales_orders (
    id bigint primary key generated always as identity,
    created_at timestamptz default now() not null,
    
    so_number text not null unique, -- Sequence: SO-YY-SEQ (e.g., SO-26-001)
    
    -- Keys
    customer_id bigint not null references customers(id),
    created_by bigint references employees(id), -- The DSE who booked it
    
    -- Dates
    order_date date not null default current_date,
    delivery_date date,
    
    -- Status
    status text default 'Draft' check (status in ('Draft', 'Confirmed', 'Processing', 'Packed', 'Dispatched', 'Invoiced', 'Cancelled')),
    
    -- Financials (Estimated)
    total_amount numeric(12,2) default 0,
    tax_amount numeric(12,2) default 0,
    
    -- Instructions (User Request)
    remarks text, -- General Notes
    payment_instruction text, -- e.g. "Collect Cash on Delivery"
    special_instruction text -- e.g. "Take Return of Damaged Goods"
);

create index if not exists idx_so_cust on sales_orders(customer_id);
create index if not exists idx_so_date on sales_orders(order_date);
create index if not exists idx_so_status on sales_orders(status);

-- Table: sales_order_lines
-- Logic: The items in the cart.
create table if not exists sales_order_lines (
    id bigint primary key generated always as identity,
    sales_order_id bigint not null references sales_orders(id) on delete cascade,
    
    product_id bigint not null references products(id),
    
    -- Quantities
    ordered_qty integer not null check (ordered_qty > 0),
    dispatched_qty integer default 0,
    cancelled_qty integer default 0,
    
    -- Pricing
    rate numeric(12,2) not null, -- The final rate applied
    tier_applied text, -- Debug: 'Dealer', 'Wholesale', 'BRAND_OVERRIDE'
    
    discount_percent numeric(5,2) default 0,
    tax_percent numeric(5,2) default 0,
    
    tax_amount numeric(12,2) default 0,
    amount numeric(12,2) default 0 -- Net Total (Rate * Qty + Tax)
);

create index if not exists idx_sol_so on sales_order_lines(sales_order_id);
create index if not exists idx_sol_prod on sales_order_lines(product_id);

-- RLS
alter table sales_orders enable row level security;
alter table sales_order_lines enable row level security;

drop policy if exists "Enable access for dev" on sales_orders;
create policy "Enable access for dev" on sales_orders for all using (true);

drop policy if exists "Enable access for dev" on sales_order_lines;
create policy "Enable access for dev" on sales_order_lines for all using (true);
