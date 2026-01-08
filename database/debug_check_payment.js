const { pool } = require('../config/db');

async function checkLatestPayment() {
    try {
        console.log('--- Checking Latest Payment ---');

        // 1. Get the latest payment
        const paymentRes = await pool.query(`
            SELECT * FROM vendor_payments 
            ORDER BY id DESC 
            LIMIT 1
        `);

        if (paymentRes.rows.length === 0) {
            console.log('No payments found.');
            return;
        }

        const payment = paymentRes.rows[0];
        console.log('Payment Details:');
        console.log(payment);

        // 2. Get allocations for this payment
        const allocRes = await pool.query(`
            SELECT pa.*, pih.invoice_number, pih.grand_total 
            FROM payment_allocations pa
            JOIN purchase_invoice_headers pih ON pa.purchase_invoice_id = pih.id
            WHERE pa.payment_id = $1
        `, [payment.id]);

        console.log('\nAllocations:');
        if (allocRes.rows.length === 0) {
            console.log('No allocations found (Advance?).');
        } else {
            console.table(allocRes.rows.map(r => ({
                AllocationID: r.id,
                InvoiceID: r.purchase_invoice_id,
                InvoiceNo: r.invoice_number,
                AllocatedAmount: r.amount
            })));
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkLatestPayment();
