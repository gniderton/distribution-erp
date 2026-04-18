const { pool } = require('../config/db');

async function targetedAudit() {
    try {
        const PIDS = [222, 224];
        
        console.log("--- 1. SALES ORDER LINES AUDIT ---");
        // Check for these products in any non-invoiced or recently invoiced orders
        const solRes = await pool.query(`
            SELECT sol.sales_order_id, so.so_number, sol.product_id, p.product_name,
                   sol.ordered_qty, sol.dispatched_qty, sol.cancelled_qty,
                   so.status as order_status, so.created_at
            FROM sales_order_lines sol
            JOIN sales_orders so ON sol.sales_order_id = so.id
            JOIN products p ON sol.product_id = p.id
            WHERE sol.product_id = ANY($1)
            ORDER BY so.created_at DESC LIMIT 10
        `, [PIDS]);
        console.table(solRes.rows);

        console.log("\n--- 2. INVENTORY BATCH TYPO CHECK ---");
        // Look for trailing spaces or case issues in status/is_active
        const batchRes = await pool.query(`
            SELECT id, product_id, batch_code, status, 
                   LENGTH(status) as status_len,
                   is_active, quantity_remaining, expiry_date
            FROM inventory_batches 
            WHERE product_id = ANY($1) AND quantity_remaining > 0
        `, [PIDS]);
        console.table(batchRes.rows);

        console.log("\n--- 3. PRODUCT MASTER SANITY CHECK ---");
        const prodRes = await pool.query(`
            SELECT id, product_name, tax_id, brand_id, category_id, is_active,
                   distributor_rate, wholesale_rate, dealer_rate, retail_rate
            FROM products WHERE id = ANY($1)
        `, [PIDS]);
        console.table(prodRes.rows);

        console.log("\n--- 4. CROSS-PRODUCT ORDER CHECK ---");
        if (solRes.rows.length > 0) {
            const lastSoId = solRes.rows[0].sales_order_id;
            console.log(`Checking all products in Order ID: ${lastSoId} (${solRes.rows[0].so_number})`);
            const allOrderLines = await pool.query(`
                SELECT sol.product_id, p.product_name, sol.ordered_qty, sol.dispatched_qty
                FROM sales_order_lines sol
                JOIN products p ON sol.product_id = p.id
                WHERE sol.sales_order_id = $1
            `, [lastSoId]);
            console.table(allOrderLines.rows);
        }

    } catch (err) {
        console.error("Audit Error:", err);
    } finally {
        await pool.end();
    }
}

targetedAudit();
