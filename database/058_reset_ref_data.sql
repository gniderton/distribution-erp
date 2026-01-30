-- Reset & Populate Reference Data
-- Channels, Route Types, Routes

BEGIN;

-- 1. Create Route Types Table (for Frequency)
CREATE TABLE IF NOT EXISTS route_types (
    id bigint primary key generated always as identity,
    frequency_name text not null unique -- Weekly, Monthly, etc.
);
-- Add references to Routes table
ALTER TABLE routes 
ADD COLUMN IF NOT EXISTS route_type_id bigint REFERENCES route_types(id);


-- 2. Clear Tables (Reset IDs)
TRUNCATE TABLE channels, routes, route_types RESTART IDENTITY CASCADE;


-- 3. Populate Channels (ID 1..4)
-- Logic: Maps to 'products' table columns
INSERT INTO channels (channel_name, price_column) VALUES
    ('Distributor', 'distributor_rate'), -- ID 1
    ('Wholesale',   'wholesale_rate'),   -- ID 2
    ('Dealer',      'dealer_rate'),      -- ID 3
    ('Retail',      'retail_rate');      -- ID 4


-- 4. Populate Route Types (ID 1..3)
INSERT INTO route_types (frequency_name) VALUES
    ('Weekly'),            -- ID 1
    ('Alternative Weeks'), -- ID 2
    ('Once in a Month');   -- ID 3


-- 5. Populate Daily Routes (ID 1..6)
-- Logic: Default to 'Weekly' (ID 1)
INSERT INTO routes (route_name, route_type_id) VALUES
    ('Monday',    1), -- ID 1
    ('Tuesday',   1), -- ID 2
    ('Wednesday', 1), -- ID 3
    ('Thursday',  1), -- ID 4
    ('Friday',    1), -- ID 5
    ('Saturday',  1); -- ID 6

COMMIT;
