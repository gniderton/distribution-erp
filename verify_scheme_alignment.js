const { pool } = require('./config/db');
const { calculateFreeItems } = require('./utils/schemeEngine');

async function verify() {
    const client = await pool.connect();
    try {
        const productId = 227; 
        const customerId = 1;

        // 1. Check stock of Product 227
        const stockRes = await client.query('SELECT SUM(quantity_remaining) FROM inventory_batches WHERE product_id = $1 AND is_active = true', [productId]);
        const stock = parseFloat(stockRes.rows[0].sum || 0);
        console.log(`Current Stock for PID ${productId}: ${stock}`);

        // 2. Mock lines
        const orderedQty = 15; // Triggers "Buy 12 Get 1 Free"
        const deliverableQty = Math.min(orderedQty, stock);
        
        console.log(`Simulated Request: Ordered ${orderedQty}, Deliverable ${deliverableQty}`);

        // 3. Compare Scheme Engine Outputs
        const resOrdered = await calculateFreeItems([{ product_id: productId, qty: orderedQty }], customerId, client);
        const resDeliverable = await calculateFreeItems([{ product_id: productId, qty: deliverableQty }], customerId, client);

        console.log("\n--- RESULT FOR ORDERED (1000) ---");
        console.log("Free Items:", JSON.stringify(resOrdered.freeItems));
        console.log("Price Slabs:", JSON.stringify(resOrdered.priceSlabs));

        console.log("\n--- RESULT FOR DELIVERABLE (" + deliverableQty + ") ---");
        console.log("Free Items:", JSON.stringify(resDeliverable.freeItems));
        console.log("Price Slabs:", JSON.stringify(resDeliverable.priceSlabs));

        if (JSON.stringify(resOrdered) !== JSON.stringify(resDeliverable)) {
            console.log("\n✅ SUCCESS: The scheme engine correctly produces different results based on deliverable stock.");
        } else {
            console.log("\nℹ️ INFO: No difference detected. (This might be because no schemes apply to this product at these levels).");
        }

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit();
    }
}

verify();
