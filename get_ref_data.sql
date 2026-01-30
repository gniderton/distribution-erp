SELECT 'Route' as type, id, route_name as name FROM routes
UNION ALL 
SELECT 'Channel' as type, id, channel_name as name FROM channels
ORDER BY type, id;
