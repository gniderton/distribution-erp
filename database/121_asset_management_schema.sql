-- 121_asset_management_schema.sql

-- 1. Create Assets Table
CREATE TABLE IF NOT EXISTS assets (
    id BIGSERIAL PRIMARY KEY,
    asset_name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Vehicles', 'Machinery', 'Furniture', 'Electronics', 'Buildings'
    purchase_date DATE NOT NULL,
    purchase_cost NUMERIC(15, 2) NOT NULL CHECK (purchase_cost > 0),
    useful_life_years NUMERIC(5, 2) NOT NULL CHECK (useful_life_years > 0),
    salvage_value NUMERIC(15, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Sold', 'Scrapped'
    asset_account_code INTEGER NOT NULL, -- e.g. 1201
    accum_dep_account_code INTEGER DEFAULT 1210,
    vendor_id BIGINT REFERENCES vendors(id), -- Optional: From whom purchased
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create Asset Transactions Table
-- Tracks specific events: Purchase, Depreciation, Sale/Retirement
CREATE TABLE IF NOT EXISTS asset_transactions (
    id BIGSERIAL PRIMARY KEY,
    asset_id BIGINT REFERENCES assets(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL, -- 'PURCHASE', 'DEPRECIATION', 'SALE', 'SCRAP'
    transaction_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    journal_entry_id BIGINT, -- Linked to journal_entries(id)
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Seed Specialized Asset COA Accounts
INSERT INTO chart_of_accounts (code, name, type) VALUES
(1201, 'Machinery & Equipment', 'ASSET'),
(1202, 'Vehicles', 'ASSET'),
(1203, 'Office Equipment', 'ASSET'),
(1204, 'Furniture & Fixtures', 'ASSET'),
(1205, 'Buildings', 'ASSET'),
(1210, 'Accumulated Depreciation', 'ASSET'), -- Contra-asset
(5020, 'Depreciation Expense', 'EXPENSE'),
(4010, 'Gain on Sale of Assets', 'INCOME'),
(5021, 'Loss on Sale of Assets', 'EXPENSE')
ON CONFLICT (code) DO NOTHING;

-- 4. Initial Sequence for Asset Numbers if needed
-- (Using bigserial for ID is usually enough, but we could add an asset_number column if desired)
