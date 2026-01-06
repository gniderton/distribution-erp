const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function apply() {
    try {
        console.log('--- Applying Purchase Invoices Schema ---');
        const sql = fs.readFileSync(path.join(__dirname, '009_rpc_inwarding.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ RPC and Schema Updates Applied Successfully.');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

apply();
