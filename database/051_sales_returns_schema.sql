-- Table: sales_returns (Credit/Debit Notes)
-- Logic: Goods coming back or price adjustments.
create table if not exists sales_returns (
    id bigint primary key generated always as identity,
    created_at timestamptz default now() not null,
    
    return_number text unique not null,
    customer_id bigint not null references customers(id),
    invoice_id bigint references sales_invoices(id), -- Optional reference to original invoice
    
    return_date date not null default current_date,
    type text not null check (type in ('Sales Return', 'Rate Adjustment', 'Damaged', 'Scheme Adjustment')),
    
    total_taxable numeric(12,2) default 0,
    total_tax numeric(12,2) default 0,
    grand_total numeric(12,2) default 0,
    
    status text default 'Draft' check (status in ('Draft', 'Applied', 'Cancelled')),
    remarks text,
    
    created_by bigint references employees(id),
    applied_by bigint references employees(id),
    applied_at timestamptz,
    
    is_active boolean default true
);

-- Table: sales_return_lines
create table if not exists sales_return_lines (
    id bigint primary key generated always as identity,
    return_id bigint not null references sales_returns(id),
    product_id bigint not null references products(id),
    batch_id bigint references inventory_batches(id), -- If we know which batch it returned to
    
    qty numeric(12,3) not null,
    rate numeric(12,2) not null,
    tax_percent numeric(5,2) default 0,
    tax_amount numeric(12,2) default 0,
    amount numeric(12,2) not null, -- Total line amount (rate * qty + tax)
    
    reason text,
    return_to_stock boolean default true -- Should this increase inventory?
);

-- Index for performance
create index if not exists idx_sr_cust on sales_returns(customer_id);
create index if not exists idx_sr_status on sales_returns(status);

-- RE-CREATE VIEW: Customer Ledger (to include Returns)
create or replace view view_customer_ledger as
select
    row_number() over (order by date, created_at) as id,
    customer_id,
    date,
    type,
    reference_number,
    description,
    debit_amount,   -- Liability Increases (Bill/Charge)
    credit_amount,  -- Liability Decreases (Payment/Return)
    status
from (
    -- A. Sales Invoices (Debit)
    select
        customer_id,
        invoice_date as date,
        created_at,
        'INVOICE' as type,
        invoice_number as reference_number,
        'Sales Invoice #' || invoice_number as description,
        grand_total as debit_amount,
        0 as credit_amount,
        status
    from sales_invoices
    where status != 'Cancelled'

    union all

    -- B. Customer Payments (Credit)
    select
        customer_id,
        payment_date as date,
        created_at,
        'PAYMENT' as type,
        coalesce(transaction_ref, 'Cash') as reference_number,
        'Payment (' || payment_mode || ')' as description,
        0 as debit_amount,
        amount as credit_amount,
        status
    from customer_payments
    where is_active = true and status != 'Rejected'

    union all

    -- C. Sales Returns (Credit)
    select
        customer_id,
        return_date as date,
        created_at,
        'RETURN' as type,
        return_number as reference_number,
        type || ' #' || return_number as description,
        0 as debit_amount,
        grand_total as credit_amount,
        status
    from sales_returns
    where status = 'Applied'
) as combined_data;

-- RLS
alter table sales_returns enable row level security;
alter table sales_return_lines enable row level security;
drop policy if exists "Enable access for dev" on sales_returns;
drop policy if exists "Enable access for dev" on sales_return_lines;
create policy "Enable access for dev" on sales_returns for all using (true);
create policy "Enable access for dev" on sales_return_lines for all using (true);
