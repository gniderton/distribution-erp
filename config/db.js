const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

// Hardcode IPv4 Pooler Address (Verified: aws-1-ap-southeast-2)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 15, // Increase pool size for concurrent Appsmith/dashboard hits
    connectionTimeoutMillis: 10000, 
    idleTimeoutMillis: 30000,
    keepAlive: true
});

module.exports = { pool };
