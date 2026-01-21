const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function applyInventorySchema() {
    try {
        console.log("Applying inventory_batches schema...");

        // Read the SQL file directly
        const sqlPath = path.join(__dirname, '021_inventory_batches.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);
        console.log("Success: inventory_batches table created.");

    } catch (err) {
        console.error("Schema Error:", err.message);
    } finally {
        pool.end();
    }
}

applyInventorySchema();
