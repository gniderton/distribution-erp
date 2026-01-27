-- Table: channels
-- Logic: Dynamic mapping of "Channel Name" (e.g. Dealer) to "Product Pricing Column" (e.g. dealer_rate)
create table if not exists channels (
    id bigint primary key generated always as identity,
    created_at timestamptz default now() not null,
    
    channel_name text not null unique, -- Display Name
    price_column text not null, -- Database Column Name in 'products' table
    
    is_active boolean default true
);

-- Seed Default Channels (Standard)
insert into channels (channel_name, price_column) values 
    ('Dealer', 'dealer_rate'),
    ('Wholesale', 'wholesale_rate'),
    ('Retail', 'retail_rate'),
    ('Distributor', 'distributor_rate')
on conflict (channel_name) do nothing;

-- RLS
alter table channels enable row level security;
drop policy if exists "Enable access for dev" on channels;
create policy "Enable access for dev" on channels for all using (true);


-- MIGRATION: Update Customers Table
-- 1. Add channel_id column
alter table customers 
    add column if not exists channel_id bigint references channels(id);

-- 2. Migrate existing text data to ID (Best Effort)
do $$
declare
    r record;
    cid bigint;
begin
    -- If default_price_tier exists, migrate it
    if exists (select 1 from information_schema.columns where table_name='customers' and column_name='default_price_tier') then
        
        -- Migrate 'Dealer'
        select id into cid from channels where channel_name = 'Dealer';
        update customers set channel_id = cid where default_price_tier = 'Dealer';
        
        -- Migrate 'Wholesale'
        select id into cid from channels where channel_name = 'Wholesale';
        update customers set channel_id = cid where default_price_tier = 'Wholesale';
        
        -- Migrate 'Retail'
        select id into cid from channels where channel_name = 'Retail';
        update customers set channel_id = cid where default_price_tier = 'Retail';

         -- Default fallback for nulls
        select id into cid from channels where channel_name = 'Dealer';
        update customers set channel_id = cid where channel_id is null;

    end if;
end $$;

-- 3. Drop old column (Safe to do now as we are in Dev)
alter table customers 
    drop column if exists default_price_tier;


-- MIGRATION: Update Customer Brand Pricing Table
-- 1. Add channel_id
alter table customer_brand_pricing 
    add column if not exists channel_id bigint references channels(id);

-- 2. Migrate Data
do $$
declare
    cid bigint;
begin
     if exists (select 1 from information_schema.columns where table_name='customer_brand_pricing' and column_name='price_tier') then
        
        -- Migrate 'Wholesale'
        select id into cid from channels where channel_name = 'Wholesale';
        update customer_brand_pricing set channel_id = cid where price_tier = 'Wholesale';
        
        -- Migrate 'Dealer'
        select id into cid from channels where channel_name = 'Dealer';
        update customer_brand_pricing set channel_id = cid where price_tier = 'Dealer';

     end if;
end $$;

-- 3. Drop old column
alter table customer_brand_pricing 
    drop column if exists price_tier;
