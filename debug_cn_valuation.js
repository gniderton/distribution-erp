const { pool } = require('./config/db');

async function debug() {
    try {
        console.log("--- 1. Credit Note Header (SR ID 2) ---");
        const srRes = await pool.query("SELECT * FROM sales_returns WHERE id = 2");
        console.table(srRes.rows);

        console.log("\n--- 2. Credit Note Lines (SR ID 2) ---");
        const srlRes = await pool.query(`
            SELECT srl.id, srl.product_id, p.product_name, srl.qty, srl.rate as gross_rate, 
                   srl.scheme_amount, srl.taxable_amount, srl.amount as net_total
            FROM sales_return_lines srl
            JOIN products p ON srl.product_id = p.id
            WHERE srl.return_id = 2
        `);
        console.table(srlRes.rows);

        console.log("\n--- 3. Trip Returns Linked to SR ID 2 ---");
        const trRes = await pool.query("SELECT id, invoice_id, product_id, qty, return_type, reason, batch_id FROM trip_returns WHERE sales_return_id = 2");
        console.table(trRes.rows);

        if (trRes.rows.length > 0) {
            const customerId = srRes.rows[0].customer_id;
            const batchId = trRes.rows[0].batch_id;
            const productId = trRes.rows[0].product_id;

            console.log(`\n--- 4. Scenario 2 Check: Historic Sales for Cust ${customerId}, Batch ${batchId} ---`);
            const historicSale = await pool.query(`
                SELECT si.id as invoice_id, si.invoice_date, sil.shipped_qty, sil.rate as gross_rate, 
                       sil.scheme_amount, sil.taxable_amount, (sil.taxable_amount / NULLIF(sil.shipped_qty, 0)) as unit_net
                FROM sales_invoice_lines sil
                JOIN sales_invoices si ON si.id = sil.invoice_id
                WHERE si.customer_id = $1 AND sil.batch_id = $2
                ORDER BY si.invoice_date DESC, si.id DESC LIMIT 5
            `, [customerId, batchId]);
            console.table(historicSale.rows);

            console.log(`\n--- 5. Historic Sales for Cust ${customerId}, Product ${productId} (Generic) ---`);
            const genericSale = await pool.query(`
                SELECT si.id as invoice_id, si.invoice_date, sil.shipped_qty, sil.rate as gross_rate, 
                       sil.scheme_amount, sil.taxable_amount, (sil.taxable_amount / NULLIF(sil.shipped_qty, 0)) as unit_net,
                       sil.batch_id
                FROM sales_invoice_lines sil
                JOIN sales_invoices si ON si.id = sil.invoice_id
                WHERE si.customer_id = $1 AND sil.product_id = $2
                ORDER BY si.invoice_date DESC, si.id DESC LIMIT 5
            `, [customerId, productId]);
            console.table(genericSale.rows);

            console.log(`\n--- 6. Check Sale in CURRENT TRIP (Trip 2) for Product ${productId} ---`);
            const tripSale = await pool.query(`
                SELECT si.id as invoice_id, si.invoice_number, sil.shipped_qty, sil.rate, sil.taxable_amount, sil.batch_id
                FROM trip_invoices ti
                JOIN sales_invoices si ON ti.invoice_id = si.id
                JOIN sales_invoice_lines sil ON si.id = sil.invoice_id
                WHERE ti.trip_id = 2 AND sil.product_id = $1
            `, [productId]);
            console.table(tripSale.rows);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
