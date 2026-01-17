const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '028_reversal_audit.sql'), 'utf8');
        await pool.query(sql);
        console.log('Applied 028_reversal_audit.sql');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
