const fs = require('fs');
const { pool } = require('./config/db');

async function run() {
    try {
        const sql = fs.readFileSync('./database/057_add_payment_details.sql', 'utf8');
        await pool.query(sql);
        console.log('Schema 057 applied successfully');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
