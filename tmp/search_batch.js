const { pool } = require('../config/db');

async function run() {
    const client = await pool.connect();
    try {
        console.log("=== SEARCHING IN inventory_batches ===");
        const res1 = await client.query("SELECT * FROM inventory_batches WHERE quantity_remaining = 210 LIMIT 5");
        console.table(res1.rows);

        console.log("=== SEARCHING IN product_batches ===");
        const res2 = await client.query("SELECT * FROM product_batches WHERE current_qty = 210 LIMIT 5");
        console.table(res2.rows);

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        client.release();
        process.exit();
    }
}
run();
