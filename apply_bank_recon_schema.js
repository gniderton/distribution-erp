const fs = require('fs');
const { pool } = require('./config/db');

async function run() {
    try {
        const sql = fs.readFileSync('./database/064_bank_statement_schema.sql', 'utf8');
        await pool.query(sql);
        console.log('Schema 064 applied successfully');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
