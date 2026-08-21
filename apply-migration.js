const fs = require('fs');
const { pool } = require('./config/db');

async function applyMigration() {
    try {
        const sql = fs.readFileSync('database/206_grn_transit_knockoff_v2.sql', 'utf8');
        await pool.query(sql);
        console.log("Migration 205 applied successfully.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        pool.end();
    }
}
applyMigration();
