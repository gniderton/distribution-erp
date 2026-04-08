-- 1. Add E-Way Bill Columns to Sales Invoices
ALTER TABLE sales_invoices
ADD COLUMN IF NOT EXISTS eway_bill_number TEXT,
ADD COLUMN IF NOT EXISTS eway_bill_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS eway_bill_valid_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS eway_bill_json JSONB;

-- 2. Create System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'General'
);

-- 3. Seed Default E-Way Bill Threshold
INSERT INTO system_settings (setting_key, setting_value, description, category)
VALUES ('eway_bill_threshold', '50000', 'Automatic E-Way Bill generation threshold (Amount in ₹)', 'Taxation')
ON CONFLICT (setting_key) DO NOTHING;

-- 4. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
