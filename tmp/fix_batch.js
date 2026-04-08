const { pool } = require('../config/db');

async function run() {
    const client = await pool.connect();
    try {
        console.log("=== SEARCHING FOR THE BATCH ===");
        // The user provided: 168 210 22/12/2026 278 ...
        // Search by product_id=168, quantity_remaining=210, batch_code='278'
        const res = await client.query(
            "SELECT id, product_id, batch_code, quantity_initial, quantity_remaining, expiry_date, mrp FROM inventory_batches WHERE product_id = 168 AND quantity_remaining = 210 AND batch_code = '278'"
        );
        
        if (res.rows.length === 0) {
            console.log("❌ No matching batch found with Qty 210.");
            const fallback = await client.query(
                "SELECT id, product_id, batch_code, quantity_initial, quantity_remaining, expiry_date FROM inventory_batches WHERE product_id = 168 AND batch_code = '278'"
            );
            console.log("Current status of this batch code for this product:");
            console.table(fallback.rows);
            return;
        }

        console.log("✅ Found the matching batch:");
        console.table(res.rows);

        const targetId = res.rows[0].id;
        console.log(`Updating ID ${targetId}: setting quantity_initial and quantity_remaining from 210 to 228...`);

        await client.query(
            "UPDATE inventory_batches SET quantity_initial = 228, quantity_remaining = 228 WHERE id = $1",
            [targetId]
        );

        console.log("🎉 Update successful!");

        const verify = await client.query(
            "SELECT id, product_id, batch_code, quantity_initial, quantity_remaining FROM inventory_batches WHERE id = $1",
            [targetId]
        );
        console.table(verify.rows);

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        client.release();
        process.exit();
    }
}
run();
