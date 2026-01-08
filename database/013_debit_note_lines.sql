-- 5. Debit Note Lines (For Item-wise Returns)
create table if not exists debit_note_lines (
    id bigint primary key generated always as identity,
    debit_note_id bigint not null references debit_notes(id) on delete cascade,
    product_id bigint not null references products(id),
    
    qty numeric(12, 3) not null check (qty > 0),
    rate numeric(12, 5) not null, -- Purchase Rate at time of return
    amount numeric(15, 2) not null, 
    
    batch_number text, -- Critical for inventory deduction
    return_type text default 'Damage' -- Damage, Expiry, Good Stock
);

create index if not exists idx_dn_lines_header on debit_note_lines(debit_note_id);
create index if not exists idx_dn_lines_product on debit_note_lines(product_id);
