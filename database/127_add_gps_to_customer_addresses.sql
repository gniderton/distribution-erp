-- Alter: customer_addresses
-- Logic: Add GPS coordinates to customer addresses
alter table customer_addresses 
    add column if not exists location_lat numeric(10, 7),
    add column if not exists location_lng numeric(10, 7);
