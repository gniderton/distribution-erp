-- 1. Debit Note Allocations Table
-- Links a Debit Note to one or more Purchase Invoices
create table if not exists debit_note_allocations (
  id bigint primary key generated always as identity,
  created_at timestamptz default now() not null,
  debit_note_id bigint not null references debit_notes(id) on delete cascade,
  purchase_invoice_id bigint not null references purchase_invoice_headers(id),
  amount numeric(12,2) not null check (amount > 0)
);

create index if not exists idx_dn_alloc_dn on debit_note_allocations(debit_note_id);
create index if not exists idx_dn_alloc_inv on debit_note_allocations(purchase_invoice_id);

-- 2. Migration: Move existing 1-to-1 links to this table
INSERT INTO debit_note_allocations (debit_note_id, purchase_invoice_id, amount)
SELECT id, linked_invoice_id, amount 
FROM debit_notes 
WHERE linked_invoice_id IS NOT NULL 
AND status = 'Approved'
AND NOT EXISTS (SELECT 1 FROM debit_note_allocations WHERE debit_note_id = debit_notes.id);

-- Note: We assume the existing 1-to-1 fully covered the bill or was intended to be full amount. 
-- In the future, 'amount' here should be calculated properly, but for migration, taking Full DN Amount is the safe starting point.
