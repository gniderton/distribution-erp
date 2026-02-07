const fs = require('fs');
const { pool } = require('./config/db');

async function run() {
    try {
        const sql = fs.readFileSync('./database/059_add_deposit_bank_to_payments.sql', 'utf8');
        await pool.query(sql);
        console.log('Schema 059 applied successfully');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
