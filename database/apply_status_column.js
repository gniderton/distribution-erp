const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
    try {
        console.log('--- Applying Migration: 031_add_batch_status.sql ---');
        const sql = fs.readFileSync(path.join(__dirname, '031_add_batch_status.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ Migration Applied Successfully: Status Column Added.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Failed:', err);
        process.exit(1);
    }
}

applyMigration();
