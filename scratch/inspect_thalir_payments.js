const { pool } = require('../config/db');

async function run() {
    try {
        console.log("=== PAYMENT ALLOCATIONS FOR THALIR TRADERS ===");
        const res = await pool.query(`
            SELECT pa.id as alloc_id, pa.amount as alloc_amount, pi.id as invoice_id, pi.invoice_number, pi.status as invoice_status, vp.id as pay_id, vp.amount as pay_amount, vp.is_active
            FROM payment_allocations pa
            JOIN purchase_invoice_headers pi ON pa.purchase_invoice_id = pi.id
            JOIN vendor_payments vp ON pa.payment_id = vp.id
            WHERE pi.vendor_id = 26 OR vp.vendor_id = 26
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
