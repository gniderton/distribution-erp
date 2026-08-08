const { pool } = require('./config/db');

async function run() {
    try {
        const client = await pool.connect();
        const pendingRes = await client.query(`
            SELECT id, invoice_number, grand_total, 
                (grand_total - COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = sales_invoices.id AND status = 'ACTIVE'), 0)) as balance
            FROM sales_invoices
            WHERE customer_id = 278 AND status != 'Cancelled'
            AND (grand_total - COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = sales_invoices.id AND status = 'ACTIVE'), 0)) > 0
            ORDER BY invoice_date DESC, created_at DESC
        `);
        console.table(pendingRes.rows);
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
