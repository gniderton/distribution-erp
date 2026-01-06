const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function apply() {
    try {
        console.log('--- Applying Product Batches Schema ---');
        const sql = fs.readFileSync(path.join(__dirname, '010_product_batches.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ Product Batches Table Created Successfully.');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

apply();
