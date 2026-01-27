-- Table: customer_payments
-- Logic: Incoming Money. DSE collects -> Admin Verifies.
create table if not exists customer_payments (
    id bigint primary key generated always as identity,
    created_at timestamptz default now() not null,
    
    customer_id bigint not null references customers(id),
    
    payment_date date not null default current_date,
    amount numeric(12,2) not null check (amount > 0),
    payment_mode text check (payment_mode in ('Cash', 'Cheque', 'UPI', 'Bank Transfer')),
    transaction_ref text, -- UTR / Cheque Number
    
    collected_by bigint references employees(id), -- The DSE who took the cash
    
    -- Verification Workflow
    status text default 'Pending' check (status in ('Pending', 'Verified', 'Rejected')),
    rejection_reason text,
    verified_by bigint references employees(id), -- Officer who checked it
    verified_at timestamptz,
    
    is_active boolean default true
);

create index if not exists idx_cp_cust on customer_payments(customer_id);
create index if not exists idx_cp_status on customer_payments(status);

-- View: Customer Ledger
-- Logic: Unified view of Invoices (Debit) and Payments (Credit)
create or replace view view_customer_ledger as
select
    row_number() over (order by date, created_at) as id,
    customer_id,
    date,
    type,
    reference_number,
    description,
    debit_amount,   -- Bill Amount (Liability Increases)
    credit_amount,  -- Paid Amount (Liability Decreases)
    status
from (
    -- A. Sales Invoices (Debit: They Owe Us)
    select
        customer_id,
        invoice_date as date,
        created_at,
        'INVOICE' as type,
        invoice_number as reference_number,
        'Sales Invoice #' || invoice_number as description,
        grand_total as debit_amount,
        0 as credit_amount,
        status -- Unpaid/Paid
    from sales_invoices
    where status != 'Cancelled'

    union all

    -- B. Customer Payments (Credit: They Paid Us)
    -- Note: We include PENDING payments for visibility, but UI might style them differently.
    select
        customer_id,
        payment_date as date,
        created_at,
        'PAYMENT' as type,
        coalesce(transaction_ref, 'Cash') as reference_number,
        'Payment (' || payment_mode || ')' as description,
        0 as debit_amount,
        amount as credit_amount,
        status -- Pending/Verified
    from customer_payments
    where is_active = true
) as combined_data;

-- RLS
alter table customer_payments enable row level security;
drop policy if exists "Enable access for dev" on customer_payments;
create policy "Enable access for dev" on customer_payments for all using (true);
