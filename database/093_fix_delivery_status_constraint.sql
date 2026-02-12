-- Fix Delivery Trip Status Constraint

-- 1. Drop old constraint
ALTER TABLE delivery_trips DROP CONSTRAINT IF EXISTS delivery_trips_status_check;

-- 2. Add new constraint allowing 'Scheduled' and 'Verified'
ALTER TABLE delivery_trips ADD CONSTRAINT delivery_trips_status_check 
CHECK (status IN ('Scheduled', 'Planned', 'In Transit', 'Completed', 'Verified', 'Cancelled'));

-- 3. Update existing 'Planned' to 'Scheduled' for consistency (Optional, but good for cleanliness)
UPDATE delivery_trips SET status = 'Scheduled' WHERE status = 'Planned';
