const { pool } = require('./config/db');
async function run() {
    const client = await pool.connect();
    try {
        console.log("=== CHECKING INVOICE 618 ===");
        const inv = await client.query("SELECT id, invoice_number, amount_paid, paid_amount FROM sales_invoices WHERE id = 618");
        console.table(inv.rows);
        
        console.log("\n=== CHECKING ALLOCATIONS FOR 618 ===");
        const alloc = await client.query("SELECT * FROM customer_payment_allocations WHERE invoice_id = 618");
        console.table(alloc.rows);

        if (alloc.rows.length > 0) {
            const payId = alloc.rows[0].payment_id;
            console.log("\n=== CHECKING PAYMENT RECORD ===");
            const pay = await client.query("SELECT id, amount, payment_mode, status, transaction_ref FROM customer_payments WHERE id = $1", [payId]);
            console.table(pay.rows);
        }
    } finally {
        client.release();
        process.exit();
    }
}
run();
