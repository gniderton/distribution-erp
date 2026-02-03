-- Fix trigger_id constraint for COMBO schemes
-- COMBO schemes don't have a single trigger_id, so it should be nullable

ALTER TABLE scheme_rules 
ALTER COLUMN trigger_id DROP NOT NULL;

-- Add a check constraint to ensure trigger_id is NOT NULL for non-COMBO schemes
ALTER TABLE scheme_rules
ADD CONSTRAINT check_trigger_id_for_non_combo 
CHECK (
  (scheme_type = 'COMBO' AND trigger_id IS NULL) OR
  (scheme_type != 'COMBO' AND trigger_id IS NOT NULL)
);

COMMENT ON CONSTRAINT check_trigger_id_for_non_combo ON scheme_rules IS 
'COMBO schemes have trigger_id = NULL (products defined in scheme_combo_products). Other scheme types must have a trigger_id.';
