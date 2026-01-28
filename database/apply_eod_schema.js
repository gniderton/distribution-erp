const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function apply() {
    try {
        const sqlPath = path.join(__dirname, '054_eod_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await pool.query(sql);
        console.log("✅ EOD Schema Applied (Reports, Denominations, Expenses)");
    } catch (err) {
        console.error("❌ Schema Failed:", err);
    } finally {
        pool.end();
    }
}

apply();
