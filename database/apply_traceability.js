const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '029_traceability.sql'), 'utf8');
        await pool.query(sql);
        console.log('Applied 029_traceability.sql');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
