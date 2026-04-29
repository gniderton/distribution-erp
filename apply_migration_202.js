const { pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
    try {
        const sqlPath = path.join(__dirname, 'database', '202_grn_auto_knockoff_debit_notes.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log("Applying Migration 202: Auto-Knockoff Logic...");
        await pool.query(sql);
        console.log("SUCCESS: Migration applied successfully.");
    } catch (err) {
        console.error("Migration Error:", err.message);
    } finally {
        await pool.end();
    }
}

applyMigration();
