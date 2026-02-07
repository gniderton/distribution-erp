const fs = require('fs');
const { pool } = require('./config/db');

async function run() {
    try {
        const sql = fs.readFileSync('./database/062_customer_payment_allocations.sql', 'utf8');
        await pool.query(sql);
        console.log('Schema 062 applied successfully');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
