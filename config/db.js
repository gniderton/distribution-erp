const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

// Hardcode IPv4 Pooler Address (Verified: aws-1-ap-southeast-2)
const pool = new Pool({
    connectionString: "postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable",
    ssl: { rejectUnauthorized: false }
});

module.exports = { pool };
