const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

// Hardcode IPv4 Pooler Address (Verified: aws-1-ap-southeast-2)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000, // 10 seconds
    idleTimeoutMillis: 30000,
    keepAlive: true
});

module.exports = { pool };
