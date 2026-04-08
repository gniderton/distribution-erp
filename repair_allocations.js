const { pool } = require('./config/db');

async function repair() {
    const isDryRun = process.argv.includes('--apply') ? false : true;
    console.log(isDryRun ? "DRY RUN MODE" : "APPLY MODE");

    try {
        // 1. Find corrupted payments (confirmed 1-34)
        // We'll scan all ACTIVE allocations and sum them up
        const corruptedRes = await pool.query(`
            SELECT 
                cp.id as payment_id,
                cp.payment_number,
                cp.amount as actual_payment_amount
            FROM customer_payments cp
            WHERE cp.id <= 500
            ORDER BY cp.id ASC
        `);

        for (const payment of corruptedRes.rows) {
            const payId = payment.payment_id;
            const actualAmount = Number(payment.actual_payment_amount);
            
            console.log(`Checking Payment ${payId}...`);

            // Get all allocations
            const allocs = await pool.query(`
                SELECT * FROM customer_payment_allocations 
                WHERE payment_id = $1 AND status = 'ACTIVE'
                ORDER BY id ASC
            `, [payId]);

            // Get all advances
            const advances = await pool.query(`
                SELECT * FROM customer_advances
                WHERE payment_id = $1
                ORDER BY id ASC
            `, [payId]);

            let totalAllocated = allocs.rows.reduce((sum, a) => sum + Number(a.amount), 0);
            let totalAdvance = advances.rows.reduce((sum, a) => sum + Number(a.amount), 0);
            let totalFound = totalAllocated + totalAdvance;

            if (totalFound > actualAmount + 0.01) {
                console.log(`\nProcessing Payment: ${payment.payment_number} (ID: ${payId})`);
                console.log(`  Actual: ${actualAmount}, Found: ${totalFound.toFixed(2)} (Excess: ${(totalFound - actualAmount).toFixed(2)})`);

                let runningTotal = 0;
                let keptAllocs = [];
                let redundantAllocs = [];

                // Identify redundant allocations
                for (const a of allocs.rows) {
                    const amt = Number(a.amount);
                    if (runningTotal + amt <= actualAmount + 0.01) {
                        runningTotal += amt;
                        keptAllocs.push(a);
                    } else {
                        redundantAllocs.push(a);
                    }
                }

                // Identify redundant advances
                let redundantAdvances = [];
                let keptAdvances = [];
                for (const adv of advances.rows) {
                    const amt = Number(adv.amount);
                    if (runningTotal + amt <= actualAmount + 0.01) {
                        runningTotal += amt;
                        keptAdvances.push(adv);
                    } else {
                        redundantAdvances.push(adv);
                    }
                }

                if (redundantAllocs.length > 0 || redundantAdvances.length > 0) {
                    console.log(`  Redundant Allocs: ${redundantAllocs.length}, Redundant Advances: ${redundantAdvances.length}`);
                    
                    if (!isDryRun) {
                        const client = await pool.connect();
                        try {
                            await client.query('BEGIN');

                            // A. Revert Invoices
                            for (const ra of redundantAllocs) {
                                console.log(`    Reverting Invoice ${ra.invoice_id} amount ${ra.amount}`);
                                await client.query(`
                                    UPDATE sales_invoices 
                                    SET amount_paid = COALESCE(amount_paid, 0) - $1,
                                        paid_amount = COALESCE(paid_amount, 0) - $1,
                                        status = CASE 
                                            WHEN (COALESCE(amount_paid, 0) - $1) <= 1 THEN 'Unpaid'
                                            ELSE 'Partially Paid'
                                        END
                                    WHERE id = $2
                                `, [ra.amount, ra.invoice_id]);
                                
                                await client.query('DELETE FROM customer_payment_allocations WHERE id = $1', [ra.id]);
                            }

                            // B. Revert Advances
                            for (const radv of redundantAdvances) {
                                console.log(`    Deleting Advance ${radv.id} amount ${radv.amount}`);
                                await client.query('DELETE FROM customer_advances WHERE id = $1', [radv.id]);
                            }

                            await client.query('COMMIT');
                            console.log(`  SUCCESS: Payment ${payment.payment_number} repaired.`);
                        } catch (err) {
                            await client.query('ROLLBACK');
                            console.error(`  ERROR: Failed to repair payment ${payId}:`, err.message);
                        } finally {
                            client.release();
                        }
                    } else {
                        redundantAllocs.forEach(ra => console.log(`    [DRY-RUN] Would revert Invoice ${ra.invoice_id} amount ${ra.amount}`));
                        redundantAdvances.forEach(radv => console.log(`    [DRY-RUN] Would delete Advance ${radv.id} amount ${radv.amount}`));
                    }
                }
            }
        }

        console.log("\nRepair Scan Complete.");

    } catch (err) {
        console.error("Repair Error:", err);
    } finally {
        await pool.end();
    }
}

repair();
