const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

// Hardcode IPv4 Pooler Address to bypass Render/Supabase IPv6 conflict.
const pool = new Pool({
    connectionString: "postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=disable",
    ssl: { rejectUnauthorized: false }
});

module.exports = { pool };
