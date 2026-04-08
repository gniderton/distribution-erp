const { pool } = require('./config/db');

async function run() {
    const client = await pool.connect();
    try {
        console.log("=== RECENT SALES INVOICES ===");
        let res = await client.query('SELECT id, invoice_number, grand_total, paid_amount, amount_paid FROM sales_invoices ORDER BY id DESC LIMIT 5');
        console.table(res.rows);

        console.log("\n=== RECENT CUSTOMER PAYMENTS ===");
        res = await client.query('SELECT id, amount, payment_mode, transaction_ref, status FROM customer_payments ORDER BY id DESC LIMIT 5');
        console.table(res.rows);

        console.log("\n=== RECENT ALLOCATIONS ===");
        res = await client.query('SELECT * FROM customer_payment_allocations ORDER BY id DESC LIMIT 5');
        console.table(res.rows);

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit();
    }
}
run();
