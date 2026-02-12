-- Seed Data: Delivery Teams
-- Creates Dummy Drivers & Vehicles if missing

DO $$ 
DECLARE 
    driverA_id BIGINT;
    driverB_id BIGINT;
    driverC_id BIGINT;
    vehicleA_id BIGINT;
    vehicleB_id BIGINT;
    vehicleC_id BIGINT;
BEGIN 

    -- 1. Create Drivers
    INSERT INTO employees (full_name, employee_code, designation, contact_primary, employment_status)
    VALUES ('Ramesh Driver', 'DRV-SEED-001', 'Driver', '9999999999', 'Active')
    ON CONFLICT (employee_code) DO NOTHING;
    
    INSERT INTO employees (full_name, employee_code, designation, contact_primary, employment_status)
    VALUES ('Suresh Driver', 'DRV-SEED-002', 'Driver', '8888888888', 'Active')
    ON CONFLICT (employee_code) DO NOTHING;

    INSERT INTO employees (full_name, employee_code, designation, contact_primary, employment_status)
    VALUES ('Mahesh Driver', 'DRV-SEED-003', 'Driver', '7777777777', 'Active')
    ON CONFLICT (employee_code) DO NOTHING;

    SELECT id INTO driverA_id FROM employees WHERE full_name = 'Ramesh Driver';
    SELECT id INTO driverB_id FROM employees WHERE full_name = 'Suresh Driver';
    SELECT id INTO driverC_id FROM employees WHERE full_name = 'Mahesh Driver';

    -- 2. Create Vehicles
    INSERT INTO vehicles (vehicle_number, vehicle_type, is_active)
    VALUES ('MH-12-AA-1111', 'Tata Ace', true) ON CONFLICT (vehicle_number) DO NOTHING;
    
    INSERT INTO vehicles (vehicle_number, vehicle_type, is_active)
    VALUES ('MH-12-BB-2222', 'Tata Ace', true) ON CONFLICT (vehicle_number) DO NOTHING;

    INSERT INTO vehicles (vehicle_number, vehicle_type, is_active)
    VALUES ('MH-12-CC-3333', 'Tata Ace', true) ON CONFLICT (vehicle_number) DO NOTHING;

    SELECT id INTO vehicleA_id FROM vehicles WHERE vehicle_number = 'MH-12-AA-1111';
    SELECT id INTO vehicleB_id FROM vehicles WHERE vehicle_number = 'MH-12-BB-2222';
    SELECT id INTO vehicleC_id FROM vehicles WHERE vehicle_number = 'MH-12-CC-3333';

    -- 3. Create Teams
    INSERT INTO delivery_teams (name, driver_id, vehicle_id, is_active)
    VALUES ('Team Alpha (North)', driverA_id, vehicleA_id, true)
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO delivery_teams (name, driver_id, vehicle_id, is_active)
    VALUES ('Team Beta (South)', driverB_id, vehicleB_id, true)
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO delivery_teams (name, driver_id, vehicle_id, is_active)
    VALUES ('Team Gamma (East)', driverC_id, vehicleC_id, true)
    ON CONFLICT (name) DO NOTHING;

END $$;
