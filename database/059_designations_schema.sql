-- Table: designations (Master Data for Job Roles)
CREATE TABLE IF NOT EXISTS designations (
    id bigint primary key generated always as identity,
    code text unique not null,
    title text not null,
    department text not null,
    created_at timestamptz default now()
);

-- Seed Data (From User)
INSERT INTO designations (code, title, department) VALUES
-- Leadership
('LD01', 'Founder', 'Leadership'),
('LD02', 'Co-Founder', 'Leadership'),
('LD03', 'Managing Director', 'Leadership'),
('LD04', 'Director', 'Leadership'),
('LD05', 'Chief Executive Officer (CEO)', 'Leadership'),
-- Management
('MG01', 'Operations Manager', 'Management'),
('MG02', 'Sales Manager', 'Management'),
('MG03', 'Finance Manager', 'Management'),
('MG04', 'Warehouse Manager', 'Management'),
-- Sales
('SE01', 'Senior Sales Executive', 'Sales'),
('SE02', 'Sales Executive (DSE)', 'Sales'), -- Key Role for App
('SE03', 'Assistant Sales Executive', 'Sales'),
('SE04', 'Route Sales Executive', 'Sales'),
('SE05', 'Field Sales Executive', 'Sales'),
('SE06', 'Sales Trainee', 'Sales'),
-- Logistics
('LG01', 'Logistics Executive', 'Logistics'),
('LG02', 'Delivery Executive', 'Logistics'),
('LG03', 'Delivery Associate', 'Logistics'),
('LG04', 'Driver', 'Logistics'),
('LG05', 'Helper / Delivery Assistant', 'Logistics'),
-- Warehouse
('WH01', 'Warehouse Executive', 'Warehouse'),
('WH02', 'Warehouse Associate', 'Warehouse'),
('WH03', 'Storekeeper', 'Warehouse'),
('WH04', 'Inventory Executive', 'Warehouse'),
('WH05', 'Warehouse Helper', 'Warehouse'),
-- Accounts
('AC01', 'Accounts Executive', 'Accounts'),
('AC02', 'Accounts Assistant', 'Accounts'),
-- Admin
('AD01', 'Office Administrator', 'Admin'),
('AD02', 'Admin Executive', 'Admin'),
-- HR
('HR01', 'HR Executive', 'HR'),
('HR02', 'HR Assistant', 'HR'),
-- IT
('IT01', 'IT Executive', 'IT'),
('IT02', 'System Administrator', 'IT'),
('IT03', 'ERP Executive', 'IT')
ON CONFLICT (code) DO NOTHING;

-- Link Employees to Designations
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS designation_id bigint REFERENCES designations(id);

-- Create Index
CREATE INDEX IF NOT EXISTS idx_emp_desig ON employees(designation_id);
