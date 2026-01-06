const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function apply() {
    try {
        console.log('--- Applying Stock Buckets Schema ---');
        const sql = fs.readFileSync(path.join(__dirname, '011_stock_buckets.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ Stock Buckets (Good/Damaged) Applied Successfully.');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

apply();
