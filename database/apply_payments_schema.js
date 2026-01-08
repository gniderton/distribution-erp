const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function applySchema() {
    try {
        console.log('--- Applying Payments & Ledger Schema ---');

        const sqlPath = path.join(__dirname, '012_payments_and_ledger.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);

        console.log('✅ Schema applied successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error applying schema:', err);
        process.exit(1);
    }
}

applySchema();
