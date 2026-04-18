const { pool } = require('../config/db');
const { calculateFreeItems } = require('../utils/schemeEngine');

async function emulateBilling() {
    const orderId = 366; // SO-00461
    const client = await pool.connect();
    
    try {
        console.log(`--- EMULATING BILLING FOR ORDER ${orderId} ---`);
        
        // 1. Fetch Order
        const soRes = await client.query('SELECT * FROM sales_orders WHERE id = $1', [orderId]);
        const so = soRes.rows[0];
        console.log(`Order Status: ${so.status}, Customer: ${so.customer_id}`);

        // 2. Fetch Lines
        const linesRes = await client.query('SELECT * FROM sales_order_lines WHERE sales_order_id = $1', [orderId]);
        const lines = linesRes.rows;
        console.log(`Order Lines: ${lines.length}`);
        lines.forEach(l => console.log(` - PID ${l.product_id}: Ordered ${l.ordered_qty}`));

        // 3. Dry Run Stock Check (IST Aware)
        const pids = lines.map(l => l.product_id);
        const stockRes = await client.query(`
            SELECT product_id, SUM(quantity_remaining) as total 
            FROM inventory_batches 
            WHERE product_id = ANY($1) 
            AND is_active = true AND status = 'Good'
            AND (expiry_date IS NULL OR expiry_date >= timezone('IST', NOW())::date)
            GROUP BY product_id
        `, [pids]);
        
        const stockMap = {};
        stockRes.rows.forEach(r => stockMap[String(r.product_id)] = parseFloat(r.total));
        console.log("StockMap:", stockMap);

        // 4. Scheme Calculation
        const orderedItems = lines.map(l => {
            const spid = String(l.product_id);
            const availableReal = stockMap[spid] || 0;
            const deliverableQty = Math.min(Number(l.ordered_qty), availableReal);
            return { product_id: Number(spid), qty: deliverableQty };
        });
        
        console.log("Input to Schemes:", orderedItems);
        const { freeItems, priceSlabs } = await calculateFreeItems(orderedItems, so.customer_id, client);
        console.log("Schemes - FreeItems:", freeItems);
        console.log("Schemes - PriceSlabs:", priceSlabs);

        // 5. FIFO Check for PID 222 specifically
        const pidToCheck = 222;
        const batchesRes = await client.query(`
            SELECT id, quantity_remaining, mrp, purchase_rate,
                    distributor_rate, wholesale_rate, dealer_rate, retail_rate, expiry_date
            FROM inventory_batches 
            WHERE product_id = $1 AND quantity_remaining > 0 AND is_active = true 
            AND status = 'Good' AND (expiry_date IS NULL OR expiry_date >= timezone('IST', NOW())::date)
            ORDER BY created_at ASC
        `, [pidToCheck]);
        
        console.log(`\nFIFO Batches for PID ${pidToCheck}:`);
        console.table(batchesRes.rows);

        // Check Product Metadata
        const pMeta = await client.query("SELECT * FROM products WHERE id = $1", [pidToCheck]);
        console.log(`Product Metadata for ${pidToCheck}:`, pMeta.rows[0]);

    } catch (err) {
        console.error("Emulation Error:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

emulateBilling();
