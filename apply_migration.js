const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function applyMigration() {
    try {
        const sqlPath = path.join(__dirname, 'database', '081_add_invoice_breakdown_cols.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Applying Migration 081...");
        await pool.query(sql);

        console.log("✅ Migration Applied Successfully");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

applyMigration();
