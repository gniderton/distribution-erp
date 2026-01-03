const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

// Hardcode IPv4 Pooler Address (Corrected Region: ap-southeast-2)
const pool = new Pool({
    connectionString: "postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable",
    ssl: { rejectUnauthorized: false }
});

module.exports = { pool };
