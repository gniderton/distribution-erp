const { pool } = require('./config/db');
// Axios removed to avoid dependency error

async function runTest() {
    console.log("🚀 Starting Scheme & Invoice Test...");
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get Reference Data
        const prodRes = await client.query('SELECT id, purchase_rate FROM products LIMIT 1');
        const custRes = await client.query('SELECT id FROM customers LIMIT 1');
        const dseRes = await client.query('SELECT id FROM employees WHERE role = $1 LIMIT 1', ['Sales Executive']);

        if (!prodRes.rows[0] || !custRes.rows[0]) throw new Error("Missing Master Data");

        const pid = prodRes.rows[0].id;
        const cid = custRes.rows[0].id;
        const did = dseRes.rows[0]?.id || null;
        const rate = 100; // Force rate for easy math

        console.log(`🔹 Using Product ID: ${pid}, Customer ID: ${cid}`);

        // 2. Create Scheme: Buy 12 Get 1 Free
        console.log("🔹 Creating Scheme: Buy 12 Get 1 Free...");
        const schemeRes = await client.query(`
            INSERT INTO schemes (scheme_name, scheme_type, start_date, is_active)
            VALUES ('Test Buy 12 Get 1', 'BUY_GET_FREE', CURRENT_DATE, true)
            RETURNING id
        `);
        const sid = schemeRes.rows[0].id;

        await client.query(`
            INSERT INTO scheme_rules (scheme_id, scheme_type, trigger_type, trigger_id, min_qty, reward_product_id, reward_qty, is_recursive)
            VALUES ($1, 'BUY_GET_FREE', 'Product', $2, 12, $2, 1, true)
        `, [sid, pid]);

        // 3. Create Sales Order (Qty 12)
        // User Logic: "Order Qty 12, Total 13". 
        // We order 12. Scheme engine adds 1.
        console.log("🔹 Creating Sales Order (Qty: 12)...");
        const yy = new Date().getFullYear().toString().slice(-2);
        const soNumber = `SO-TEST-${Date.now()}`;

        const soRes = await client.query(`
            INSERT INTO sales_orders (so_number, customer_id, created_by, order_date, status)
            VALUES ($1, $2, $3, CURRENT_DATE, 'Draft')
            RETURNING id
        `, [soNumber, cid, did]);
        const soId = soRes.rows[0].id;

        // Line Item: 12 Units @ 100, 5% Tax
        await client.query(`
            INSERT INTO sales_order_lines (sales_order_id, product_id, ordered_qty, rate, tax_percent, amount)
            VALUES ($1, $2, 12, $3, 5, $4)
        `, [soId, pid, rate, 12 * rate * 1.05]);

        // 4. Dispatch (Simulate API Logic via HTTP would be best to test actual code)
        // But since we can't easily self-call if server not running in this process context easily,
        // we will use the logic we just wrote? No, we should use the API to verify the ROUTE logic.

        // Wait! We can't call localhost API easily if the server isn't running in THIS script.
        // The server IS running on Render.
        // I should call the RENDER URL?
        // Or I can just replicate the dispatch logic call?
        // Better: I will use the `routes/sales.js` logic by importing it? Hard with Express.
        // Best: Call the Local API if I can start it? No.

        // I will use `axios` to call the deployed URL?
        // User asked "Shall i generate...".
        // Use the deployed URL.

        await client.query('COMMIT');
        console.log(`✅ Setup Complete. Order ID: ${soId}`);
        console.log(`👉 Now run: curl -X POST https://distribution-erp.onrender.com/api/sales/orders/${soId}/dispatch`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

runTest();
