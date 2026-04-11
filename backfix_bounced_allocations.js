
const { pool } = require('./config/db');

async function backFixBouncedAllocations() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const chqRes = await client.query(`
            SELECT id, reference_id 
            FROM cheques 
            WHERE status = 'BOUNCED' AND reference_type = 'CUSTOMER_PAYMENT' AND party_id = 269
        `);

        console.log(`Found ${chqRes.rows.length} bounced customer cheques to repair.`);

        for (const chq of chqRes.rows) {
            const paymentId = chq.reference_id;
            
            const allocUpdate = await client.query(`
                UPDATE customer_payment_allocations 
                SET status = 'REVERSED' 
                WHERE payment_id = $1 AND status = 'ACTIVE'
                RETURNING invoice_id
            `, [paymentId]);

            console.log(`Reversed ${allocUpdate.rowCount} allocations for Payment ${paymentId}.`);

            const affectedInvs = [...new Set(allocUpdate.rows.map(r => r.invoice_id))];
            for (const invId of affectedInvs) {
                await client.query(`
                    UPDATE sales_invoices si
                    SET 
                        amount_paid = COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0) +
                                      COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0) +
                                      COALESCE((SELECT SUM(grand_total) FROM sales_returns WHERE invoice_id = si.id AND status = 'Applied'), 0)
                    WHERE id = $1
                `, [invId]);

                await client.query(`
                    UPDATE sales_invoices si
                    SET status = CASE 
                        WHEN amount_paid <= 0 THEN 'Unpaid'
                        WHEN amount_paid < (grand_total - 0.01) THEN 'Partially Paid'
                        ELSE 'Paid'
                    END
                    WHERE id = $1
                `, [invId]);
                
                console.log(`Restored status for Invoice ID ${invId}.`);
            }

            await client.query(`UPDATE customer_payments SET status = 'Rejected', rejection_reason = 'Cheque Bounced' WHERE id = $1`, [paymentId]);
        }

        await client.query('COMMIT');
        console.log('✅ Back-fix successful!');
        
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Back-fix failed:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

backFixBouncedAllocations();
