const { pool } = require('../config/db');

async function run() {
    try {
        console.log("Adding source_type column...");
        await pool.query("ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'GRN'");
        
        console.log("Tagging Returns...");
        await pool.query("UPDATE inventory_batches SET source_type = 'RETURN' WHERE id IN (SELECT batch_id FROM sales_return_lines)");
        
        console.log("Tagging Migration Stock...");
        await pool.query("UPDATE inventory_batches SET source_type = 'MIGRATION' WHERE grn_id IS NULL AND source_type != 'RETURN'");
        
        console.log("Schema updated and backfilled successfully.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
