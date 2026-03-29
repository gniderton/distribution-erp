const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function run() {
    try {
        const sqlPath = path.join(__dirname, 'database/105_add_report_id_to_returns.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('Applying migration 105...');
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
