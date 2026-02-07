const { pool } = require('./config/db');

async function fixAndRun() {
    try {
        console.log("Creating Correct Scheme for Product 13...");
        const pid = 13;

        // 1. Create Scheme
        const schemeRes = await pool.query(`
            INSERT INTO schemes (scheme_name, start_date, is_active)
            VALUES ('Valid Test Buy 12 Get 1', CURRENT_DATE, true)
            RETURNING id
        `);
        const sid = schemeRes.rows[0].id;

        await pool.query(`
            INSERT INTO scheme_rules (scheme_id, scheme_type, trigger_type, trigger_id, min_qty, reward_product_id, reward_qty, is_recursive)
            VALUES ($1, 'BUY_GET_FREE', 'Product', $2, 12, $2, 1, true)
        `, [sid, pid]);

        // 2. Create Order 5
        const cid = 494;
        const soRes = await pool.query(`
            INSERT INTO sales_orders (so_number, customer_id, created_by, order_date, status)
            VALUES ('SO-TEST-ORDER-6', $1, null, CURRENT_DATE, 'Draft')
            RETURNING id
        `, [cid]);
        const soId = soRes.rows[0].id;

        await pool.query(`
            INSERT INTO sales_order_lines (sales_order_id, product_id, ordered_qty, rate, tax_percent, amount)
            VALUES ($1, $2, 12, 100, 5, 1260)
        `, [soId, pid]);

        console.log(`✅ Scheme Created & Order 5 (${soId}) Placed.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixAndRun();
