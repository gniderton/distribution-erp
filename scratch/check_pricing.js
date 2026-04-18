const { pool } = require('../config/db');

async function checkPricing() {
    try {
        const PIDS = [222, 224];
        
        console.log("--- BATCH PRICING CHECK ---");
        const batchRes = await pool.query(`
            SELECT id, product_id, distributor_rate, wholesale_rate, dealer_rate, retail_rate, mrp
            FROM inventory_batches 
            WHERE product_id = ANY($1) AND quantity_remaining > 0
        `, [PIDS]);
        console.table(batchRes.rows);

        console.log("\n--- CUSTOMER CHANNEL CHECK ---");
        // Let's check a few recent orders to see the channel
        const orderRes = await pool.query(`
            SELECT so.id, so.so_number, so.customer_id, c.customer_name, ch.name as channel_name, ch.price_column
            FROM sales_orders so
            JOIN customers c ON so.customer_id = c.id
            JOIN channels ch ON c.channel_id = ch.id
            WHERE so.status = 'Draft' OR so.status = 'Confirmed'
            ORDER BY so.created_at DESC LIMIT 5
        `);
        console.table(orderRes.rows);

    } catch (err) {
        console.error("Pricing Check Error:", err);
    } finally {
        await pool.end();
    }
}

checkPricing();
