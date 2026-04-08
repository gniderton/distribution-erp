const { pool } = require('./config/db');

async function run() {
    const client = await pool.connect();
    try {
        console.log("Finding inconsistent invoices...");
        const res = await client.query(`
            SELECT i.id, i.invoice_number, i.customer_id, i.grand_total, i.amount_paid, i.invoice_date, c.dse_id
            FROM sales_invoices i
            JOIN customers c ON i.customer_id = c.id
            LEFT JOIN customer_payment_allocations a ON i.id = a.invoice_id
            WHERE i.amount_paid > 0 AND a.id IS NULL
        `);
        
        console.log(`Found ${res.rows.length} invoices to fix.`);
        
        let fixedCount = 0;
        for (const inv of res.rows) {
            try {
                await client.query('BEGIN');
                
                // 1. Create Payment
                const payRes = await client.query(`
                    INSERT INTO customer_payments (
                        customer_id, amount, payment_date, payment_mode, 
                        transaction_ref, status, collected_by, verification_status, verified_by
                    ) VALUES ($1, $2, $3, 'Cash', 'MIGRATION', 'Verified', $4, 'Verified', 1)
                    RETURNING id
                `, [
                    inv.customer_id, 
                    inv.amount_paid, 
                    inv.invoice_date,
                    inv.dse_id
                ]);

                const paymentId = payRes.rows[0].id;

                // 2. Create Allocation
                await client.query(`
                    INSERT INTO customer_payment_allocations (
                        payment_id, invoice_id, amount, status
                    ) VALUES ($1, $2, $3, 'ACTIVE')
                `, [paymentId, inv.id, inv.amount_paid]);

                await client.query('COMMIT');
                fixedCount++;
                if (fixedCount % 50 === 0) console.log(`Fixed ${fixedCount} invoices...`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`Failed to fix invoice ${inv.invoice_number}:`, err.message);
            }
        }
        
        console.log(`Successfully fixed ${fixedCount} invoices.`);

    } catch (e) {
        console.error("Backfill Script Error:", e);
    } finally {
        client.release();
        process.exit();
    }
}

run();
