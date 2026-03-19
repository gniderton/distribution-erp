const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function applyFix() {
    try {
        const sqlPath = path.join(__dirname, 'database', '137_emp_designation_to_id.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Applying Migration 137...");
        await pool.query(sql);

        console.log("✅ Migration 137 Applied Successfully");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

applyFix();
