const { pool } = require('./config/db');

async function createOrder4() {
    try {
        console.log("Creating Order 4...");
        const pid = 13;
        const cid = 494; // From previous run

        const soRes = await pool.query(`
            INSERT INTO sales_orders (so_number, customer_id, created_by, order_date, status)
            VALUES ('SO-TEST-ORDER-4', $1, null, CURRENT_DATE, 'Draft')
            RETURNING id
        `, [cid]);
        const soId = soRes.rows[0].id;
        console.log(`Order 4 Created. ID: ${soId}`);

        await pool.query(`
            INSERT INTO sales_order_lines (sales_order_id, product_id, ordered_qty, rate, tax_percent, amount)
            VALUES ($1, $2, 12, 100, 5, 1260)
        `, [soId, pid]);

        console.log("Line Added: 12 Units @ 100");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createOrder4();
