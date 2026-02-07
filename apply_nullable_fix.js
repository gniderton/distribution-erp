const fs = require('fs');
const { pool } = require('./config/db');

async function run() {
    try {
        const sql = fs.readFileSync('./database/061_make_purchase_invoice_id_nullable.sql', 'utf8');
        await pool.query(sql);
        console.log('Schema 061 applied successfully');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
