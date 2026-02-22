-- Create sync logs table
CREATE TABLE IF NOT EXISTS sync_logs (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    trip_id TEXT,
    payload_summary JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
