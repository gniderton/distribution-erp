const { pool } = require('../config/db');

async function debugOrder352() {
    try {
        const orderId = 352;
        console.log(`--- DEBUGGING STOCK CHECK FOR ORDER ${orderId} ---`);
        
        const linesRes = await pool.query('SELECT product_id FROM sales_order_lines WHERE sales_order_id = $1', [orderId]);
        const pids = linesRes.rows.map(l => l.product_id);
        console.log("PIDs in Order:", pids);

        const stockRes = await pool.query(`
            SELECT product_id, SUM(quantity_remaining) as total 
            FROM inventory_batches 
            WHERE product_id = ANY($1) 
            AND is_active = true AND status = 'Good'
            AND (expiry_date IS NULL OR expiry_date >= timezone('IST', NOW())::date)
            GROUP BY product_id
        `, [pids]);
        
        console.log("Stock Found in Dry Run:");
        console.table(stockRes.rows);

        // Check for any product in this order that IS NOT in the stock selection results
        const foundPids = stockRes.rows.map(r => r.product_id);
        const missing = pids.filter(p => !foundPids.includes(p));
        console.log("PIDs with ZERO available stock according to this query:", missing);

        if (missing.length > 0) {
            console.log("\nDeep check for first missing PID:", missing[0]);
            const deepRes = await pool.query(`
                SELECT id, status, is_active, expiry_date, quantity_remaining 
                FROM inventory_batches WHERE product_id = $1
            `, [missing[0]]);
            console.table(deepRes.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debugOrder352();
