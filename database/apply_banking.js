const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function apply() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '017_banking_schema.sql'), 'utf8');
        await pool.query(sql);
        console.log('Applied 017_banking_schema.sql successfully and seeded banks.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
apply();
