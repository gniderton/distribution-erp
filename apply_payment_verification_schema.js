const fs = require('fs');
const { pool } = require('./config/db');

async function run() {
    try {
        const sql = fs.readFileSync('./database/056_payment_verification_schema.sql', 'utf8');
        await pool.query(sql);
        console.log('Schema applied successfully');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
