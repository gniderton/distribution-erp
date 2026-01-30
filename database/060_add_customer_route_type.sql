-- Add Route Type ID to Customers
-- Purpose: Store visit frequency at customer level (Weekly, Monthly)
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS route_type_id bigint REFERENCES route_types(id);
