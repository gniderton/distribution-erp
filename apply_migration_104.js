const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function run() {
    try {
        const sqlPath = path.join(__dirname, 'database/104_add_idempotency_ids.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('Applying migration 104...');
        await pool.query(sql);
        console.log('Migration applied successfully!');
        
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await pool.end();
        process.exit();
    }
}

run();
