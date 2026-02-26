SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'trip_returns' 
AND column_name IN ('sync_id', 'verification_status', 'verified_by');
