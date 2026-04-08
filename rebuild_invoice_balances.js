const { pool } = require('./config/db');

async function rebuildBalances(isDryRun = true) {
    console.log(isDryRun ? "DRY RUN: Calculating Invoice Balances..." : "APPLY MODE: Rebuilding Invoice Balances...");
    
    try {
        // 1. Identify all potentially affected invoices
        // - Those with negative paid_amount
        // - Those touched by the 34 payment IDs we repaired
        const affectedRes = await pool.query(`
            SELECT DISTINCT i.id, i.invoice_number, i.grand_total, i.paid_amount, i.amount_paid
            FROM sales_invoices i
            LEFT JOIN customer_payment_allocations cpa ON i.id = cpa.invoice_id
            WHERE i.paid_amount < 0 
               OR i.amount_paid < 0
               OR cpa.payment_id IN (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34)
            ORDER BY i.id ASC
        `);

        console.log(`Found ${affectedRes.rows.length} invoices to re-check.`);
        let repairCount = 0;

        for (const inv of affectedRes.rows) {
            // 2. Calculate Truth Sum from customer_payment_allocations
            const truthRes = await pool.query(`
                SELECT COALESCE(SUM(amount), 0) as total_allocated
                FROM customer_payment_allocations
                WHERE invoice_id = $1 AND status = 'ACTIVE'
            `, [inv.id]);

            const trueSum = Number(truthRes.rows[0].total_allocated);
            const currentPaid = Number(inv.paid_amount || 0);

            if (Math.abs(trueSum - currentPaid) > 0.01) {
                repairCount++;
                console.log(`\nInvoice: ${inv.invoice_number} (ID: ${inv.id})`);
                console.log(`  Current Paid: ${currentPaid}`);
                console.log(`  True Sum (from Allocs): ${trueSum}`);
                console.log(`  Difference: ${trueSum - currentPaid}`);

                if (!isDryRun) {
                    // 3. Update Invoice
                    const newStatus = (trueSum >= Number(inv.grand_total) - 1) ? 'Paid' : (trueSum > 0 ? 'Partially Paid' : 'Unpaid');
                    
                    await pool.query(`
                        UPDATE sales_invoices 
                        SET paid_amount = $1, 
                            amount_paid = $1,
                            status = $2
                        WHERE id = $3
                    `, [trueSum, newStatus, inv.id]);
                    
                    console.log(`  ✅ FIXED: New Status: ${newStatus}`);
                }
            }
        }

        console.log(`\nScan Complete. ${repairCount} invoices need/needed repair.`);

    } catch (err) {
        console.error("Rebuild Error:", err);
    } finally {
        await pool.end();
    }
}

const args = process.argv.slice(2);
const isApply = args.includes('--apply');
rebuildBalances(!isApply);
