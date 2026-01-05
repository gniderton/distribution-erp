const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function applyRPC() {
    try {
        console.log('Connecting to Cloud Database...');
        const sql = fs.readFileSync(path.join(__dirname, '007_rpc_update_po.sql'), 'utf8');

        console.log('Creating Stored Procedure: update_purchase_order...');
        await pool.query(sql);

        console.log('✅ Success! Update Procedure created.');
    } catch (err) {
        console.error('❌ Failed:', err);
    } finally {
        await pool.end();
    }
}

applyRPC();
