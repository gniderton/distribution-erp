-- 1. Vendor Payments Table
-- Stores the actual money leaving the account.
create table if not exists vendor_payments (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  vendor_id bigint not null references vendors(id),
  amount numeric(12,2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_mode text not null, -- 'Cash', 'Cheque', 'UPI', 'Bank Transfer'
  transaction_ref text, -- Cheque No, UTR, etc.
  remarks text,
  is_active boolean default true
);

-- Index for fast lookup by vendor
create index if not exists idx_payments_vendor on vendor_payments(vendor_id);


-- 2. Payment Allocations Table (The "Linker")
-- Maps a portion of a Payment to a specific Purchase Invoice.
create table if not exists payment_allocations (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  payment_id bigint not null references vendor_payments(id),
  purchase_invoice_id bigint not null references purchase_invoice_headers(id),
  amount numeric(12,2) not null check (amount > 0)
);

-- Indexes for finding "Which bills did this pay?" and "How much is paid on this bill?"
create index if not exists idx_alloc_payment on payment_allocations(payment_id);
create index if not exists idx_alloc_invoice on payment_allocations(purchase_invoice_id);


-- 3. Debit Notes (Purchase Returns / Deductions)
create table if not exists debit_notes (
    id bigint primary key generated always as identity,
    created_at timestamptz default now() not null,
    vendor_id bigint not null references vendors(id),
    linked_invoice_id bigint references purchase_invoice_headers(id), -- Optional link
    debit_note_number text unique,
    debit_note_date date not null default current_date,
    amount numeric(12,2) not null check (amount > 0),
    reason text,
    status text default 'Draft' -- Draft, Approved, Applied
);
create index if not exists idx_debit_vendor on debit_notes(vendor_id);


-- 4. The Ledger View (The "Source of Truth")
-- Combines Invoices (Cr), Payments (Dr), and Debit Notes (Dr)
create or replace view view_vendor_ledger as
select
    row_number() over (order by date, created_at) as id,
    vendor_id,
    date,
    type,
    reference_number,
    description,
    credit_amount, -- We owe them (Bills)
    debit_amount   -- We paid them (Payments/Returns)
from (
    -- A. Invoices (Credit - Liability increases)
    select
        vendor_id,
        received_date as date,
        created_at,
        'INVOICE' as type,
        vendor_invoice_number as reference_number,
        'Purchase Invoice #' || invoice_number as description,
        grand_total as credit_amount,
        0 as debit_amount
    from purchase_invoice_headers
    where status != 'Cancelled'

    union all

    -- B. Payments (Debit - Liability decreases)
    select
        vendor_id,
        payment_date as date,
        created_at,
        'PAYMENT' as type,
        transaction_ref as reference_number,
        'Payment via ' || payment_mode as description,
        0 as credit_amount,
        amount as debit_amount
    from vendor_payments
    where is_active = true

    union all

    -- C. Debit Notes (Debit - Liability decreases)
    select
        vendor_id,
        debit_note_date as date,
        created_at,
        'DEBIT_NOTE' as type,
        debit_note_number as reference_number,
        'Debit Note: ' || reason as description,
        0 as credit_amount,
        amount as debit_amount
    from debit_notes
    where status = 'Approved'
) as combined_data;
