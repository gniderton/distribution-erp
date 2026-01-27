-- Table: sales_invoices
-- Logic: The final bill. Generated automatically from Dispatch Logic.
create table if not exists sales_invoices (
    id bigint primary key generated always as identity,
    created_at timestamptz default now() not null,
    
    invoice_number text not null unique, -- Sequence: INV-26-001
    
    sales_order_id bigint references sales_orders(id), -- Link to Order
    customer_id bigint not null references customers(id), -- Denormalized for easier querying
    
    invoice_date date not null default current_date,
    
    -- Status
    status text default 'Unpaid' check (status in ('Unpaid', 'Partially Paid', 'Paid', 'Cancelled', 'Reversed')),
    
    -- Financials (Final)
    total_taxable numeric(12,2) default 0,
    total_cgst numeric(12,2) default 0,
    total_sgst numeric(12,2) default 0,
    total_igst numeric(12,2) default 0,
    grand_total numeric(12,2) default 0,
    
    paid_amount numeric(12,2) default 0, -- To track payment status
    balance_amount numeric(12,2) generated always as (grand_total - paid_amount) stored
);

create index if not exists idx_inv_cust on sales_invoices(customer_id);
create index if not exists idx_inv_date on sales_invoices(invoice_date);
create index if not exists idx_inv_so on sales_invoices(sales_order_id);

-- RLS
alter table sales_invoices enable row level security;
drop policy if exists "Enable access for dev" on sales_invoices;
create policy "Enable access for dev" on sales_invoices for all using (true);
