const fs = require('fs');
const path = require('path');
// This loads the Cloud Connection String from .env
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function applyRPC() {
    try {
        console.log('Connecting to Cloud Database...');
        const sql = fs.readFileSync(path.join(__dirname, '006_rpc_create_po.sql'), 'utf8');

        console.log('Creating Stored Procedure: create_purchase_order...');
        await pool.query(sql);

        console.log('✅ Success! Procedure created on Supabase.');
    } catch (err) {
        console.error('❌ Failed:', err);
    } finally {
        await pool.end();
    }
}

applyRPC();
