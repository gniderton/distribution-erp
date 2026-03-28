-- 187_add_offline_id_to_returns.sql
-- Purpose: Enable idempotency for delivery returns during "Chaos-Proof" sync

ALTER TABLE trip_returns ADD COLUMN IF NOT EXISTS offline_id VARCHAR(100) UNIQUE;

COMMENT ON COLUMN trip_returns.offline_id IS 'Unique identifier from mobile app for sync tracking and duplicate prevention';
