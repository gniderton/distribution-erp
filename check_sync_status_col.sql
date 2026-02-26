SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'sync_logs' 
AND column_name = 'status';
