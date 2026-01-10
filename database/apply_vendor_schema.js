const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function apply() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '018_vendor_schema_update.sql'), 'utf8');
        console.log('Applying Vendor Schema Update...');
        await pool.query(sql);
        console.log('Schema Applied Successfully.');

        console.log('Verifying Columns...');
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'vendors'
        `);
        console.table(res.rows.map(r => r.column_name));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
apply();
