const { pool } = require('../config/db');

async function repairReturns() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('--- Starting Historical Sales Return Repair ---');

        // 1. Find Unallocated Returns
        const res = await client.query(`
            SELECT 
                sr.id, 
                sr.return_number, 
                sr.customer_id, 
                sr.grand_total, 
                sr.invoice_id
            FROM sales_returns sr
            WHERE sr.status != 'Cancelled' AND sr.is_active = true
            AND NOT EXISTS (SELECT 1 FROM customer_payment_allocations WHERE return_id = sr.id)
        `);

        console.log(`Found ${res.rows.length} returns to process.`);

        for (const ret of res.rows) {
            let remaining = Number(ret.grand_total);
            console.log(`  Processing ${ret.return_number} (Amount: ${remaining}, Cust: ${ret.customer_id})...`);

            // A. Priority: Linked Invoice (if exists)
            if (ret.invoice_id) {
                const invRes = await client.query(`
                    SELECT id, grand_total - COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = sales_invoices.id), 0) as balance
                    FROM sales_invoices WHERE id = $1
                `, [ret.invoice_id]);

                if (invRes.rows.length > 0) {
                    const balance = Number(invRes.rows[0].balance);
                    const alloc = Math.min(balance, remaining);
                    if (alloc > 0.01) {
                        await client.query(`
                            INSERT INTO customer_payment_allocations (invoice_id, amount, allocated_at, return_id, status)
                            VALUES ($1, $2, NOW(), $3, 'ACTIVE')
                        `, [ret.invoice_id, alloc, ret.id]);
                        console.log(`    - Allocated ${alloc} to specific invoice ${ret.invoice_id}`);
                        remaining -= alloc;
                    }
                }
            }

            // B. Spillover: LIFO (Newest First)
            if (remaining > 0.01) {
                const pendingRes = await client.query(`
                    SELECT id, (grand_total - COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = sales_invoices.id), 0)) as balance
                    FROM sales_invoices
                    WHERE customer_id = $1 AND status != 'Cancelled'
                    AND (grand_total - COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = sales_invoices.id), 0)) > 0
                    ORDER BY invoice_date DESC, created_at DESC
                `, [ret.customer_id]);

                for (const inv of pendingRes.rows) {
                    if (remaining <= 0.01) break;
                    const alloc = Math.min(Number(inv.balance), remaining);
                    if (alloc > 0.01) {
                        await client.query(`
                            INSERT INTO customer_payment_allocations (invoice_id, amount, allocated_at, return_id, status)
                            VALUES ($1, $2, NOW(), $3, 'ACTIVE')
                        `, [inv.id, alloc, ret.id]);
                        console.log(`    - Allocated ${alloc} to invoice ${inv.id} via LIFO`);
                        remaining -= alloc;
                    }
                }
            }
        }

        // 2. [CRITICAL] Sync Invoice amount_paid and status with Allocations
        console.log('\n--- Syncing Invoice Headers with Allocations ---');
        await client.query(`
            WITH AllocTotals AS (
                SELECT 
                    invoice_id, 
                    SUM(amount) as total_allocated
                FROM customer_payment_allocations
                WHERE status = 'ACTIVE'
                GROUP BY invoice_id
            )
            UPDATE sales_invoices si
            SET 
                amount_paid = COALESCE(at.total_allocated, 0),
                status = CASE 
                    WHEN COALESCE(at.total_allocated, 0) >= (si.grand_total - 0.01) THEN 'Paid'
                    WHEN COALESCE(at.total_allocated, 0) > 0 THEN 'Partially Paid'
                    ELSE 'Unpaid'
                END
            FROM AllocTotals at
            WHERE si.id = at.invoice_id
        `);

        // Also reset invoices that have NO allocations back to 0/Unpaid
        await client.query(`
            UPDATE sales_invoices
            SET amount_paid = 0, status = 'Unpaid'
            WHERE id NOT IN (SELECT DISTINCT invoice_id FROM customer_payment_allocations WHERE status = 'ACTIVE')
            AND amount_paid > 0
        `);

        await client.query('COMMIT');
        console.log('--- REPAIR COMPLETED SUCCESSFULLY ---');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Repair failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

repairReturns();
