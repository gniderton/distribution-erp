const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function apply() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '016_refunds_schema.sql'), 'utf8');
        await pool.query(sql);
        console.log('Applied 016_refunds_schema.sql successfully.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
apply();
