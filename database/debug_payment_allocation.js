const { pool } = require('../config/db');

async function debug() {
    try {
        console.log('--- Bill 49 Details ---');
        // Removed paid_amount as it doesn't exist
        const bill = await pool.query('SELECT id, invoice_number, grand_total, status FROM purchase_invoice_headers WHERE id = 49');
        console.table(bill.rows);

        console.log('--- Recent Payments for Vendor 7 ---');
        const payments = await pool.query('SELECT * FROM vendor_payments WHERE vendor_id = 7 ORDER BY created_at DESC LIMIT 5');
        console.table(payments.rows);

        if (payments.rows.length > 0) {
            for (const pay of payments.rows) {
                console.log(`--- Allocations for Payment ID ${pay.id} (Amt: ${pay.amount}) ---`);
                const allocs = await pool.query('SELECT * FROM payment_allocations WHERE payment_id = $1', [pay.id]);
                console.table(allocs.rows);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
debug();
