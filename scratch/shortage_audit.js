const { pool } = require('../config/db');

async function shortageAudit() {
    try {
        const PIDS = [222, 224];
        const TARGET_DATE = '2026-04-14';
        
        console.log(`--- SHORTAGE AUDIT FOR ${TARGET_DATE} (PIDs 222, 224) ---`);
        const res = await pool.query(`
            SELECT 
                so.id as order_id, 
                so.so_number, 
                c.customer_name,
                sol.product_id, 
                p.product_name,
                sol.ordered_qty, 
                sol.dispatched_qty,
                (sol.ordered_qty - sol.dispatched_qty) as shortage,
                so.status as order_status
            FROM sales_order_lines sol
            JOIN sales_orders so ON sol.sales_order_id = so.id
            JOIN customers c ON so.customer_id = c.id
            JOIN products p ON sol.product_id = p.id
            WHERE sol.product_id = ANY($1) 
              AND so.order_date::date = $2
              AND sol.dispatched_qty < sol.ordered_qty
            ORDER BY so.so_number ASC
        `, [PIDS, TARGET_DATE]);

        if (res.rows.length === 0) {
            console.log("No shortages found for these products on this date.");
        } else {
            console.table(res.rows);
            
            // Group by Order to see the impact
            const summary = {};
            res.rows.forEach(r => {
                if (!summary[r.so_number]) summary[r.so_number] = { customer: r.customer_name, items: [] };
                summary[r.so_number].items.push(`${r.product_name} (Missed: ${r.shortage})`);
            });
            console.log("\n--- Order Summary ---");
            console.log(JSON.stringify(summary, null, 2));
        }

    } catch (err) {
        console.error("Shortage Audit Error:", err);
    } finally {
        await pool.end();
    }
}

shortageAudit();
