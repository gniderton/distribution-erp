-- Add service_day to routes table for scheduling
ALTER TABLE routes ADD COLUMN IF NOT EXISTS service_day text; -- e.g. 'Monday', 'Tuesday'

-- Constraint to ensure valid days (Optional but good practice)
ALTER TABLE routes DROP CONSTRAINT IF EXISTS check_service_day;
ALTER TABLE routes ADD CONSTRAINT check_service_day 
CHECK (service_day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'));

-- Auto-update existing routes based on name if possible (One-time migration)
UPDATE routes SET service_day = 'Monday' WHERE route_name ILIKE '%Monday%';
UPDATE routes SET service_day = 'Tuesday' WHERE route_name ILIKE '%Tuesday%';
UPDATE routes SET service_day = 'Wednesday' WHERE route_name ILIKE '%Wednesday%';
UPDATE routes SET service_day = 'Thursday' WHERE route_name ILIKE '%Thursday%';
UPDATE routes SET service_day = 'Friday' WHERE route_name ILIKE '%Friday%';
UPDATE routes SET service_day = 'Saturday' WHERE route_name ILIKE '%Saturday%';
UPDATE routes SET service_day = 'Sunday' WHERE route_name ILIKE '%Sunday%';
