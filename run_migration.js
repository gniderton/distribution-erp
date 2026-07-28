const { pool } = require('./config/db');
const fs = require('fs');

async function run() {
    const sql = fs.readFileSync('./database/206_background_jobs_schema.sql', 'utf8');
    try {
        await pool.query(sql);
        console.log('Migration successful');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}
run();
