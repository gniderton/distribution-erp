const { pool } = require('./config/db');

async function audit() {
    const targetInvoices = [
        { id: 38, supposed: 0 },
        { id: 48, supposed: 0 },
        { id: 19, supposed: 0 },
        { id: 20, supposed: 0 },
        { id: 23, supposed: 0 },
        { id: 25, supposed: 5094 },
        { id: 26, supposed: 0 },
        { id: 31, supposed: 0 },
        { id: 51, supposed: 0 },
        { id: 54, supposed: 0 },
        { id: 55, supposed: 0 }
    ];
    
    console.log("Starting FINAL Deep Audit for Phantom Invoices...");
    
    for (const item of targetInvoices) {
        try {
            const id = item.id;
            const supposed = item.supposed;
            
            console.log(`\n=========================================`);
            console.log(`AUDITING INVOICE ID: ${id} | Supposed Migration: ${supposed}`);
            
            const invRes = await pool.query("SELECT invoice_number, grand_total, amount_paid FROM sales_invoices WHERE id = $1", [id]);
            const inv = invRes.rows[0];
            console.log(`Invoice: ${inv.invoice_number} | Grand Total: ${inv.grand_total} | Total Paid In System: ${inv.amount_paid}`);

            // 1. Get All Allocations
            const allocs = await pool.query(`
                SELECT a.id as a_id, a.amount as a_amt, p.id as p_id, p.transaction_ref, p.amount as p_amt, p.status as p_status, p.payment_date
                FROM customer_payment_allocations a
                JOIN customer_payments p ON a.payment_id = p.id
                WHERE a.invoice_id = $1 AND a.status = 'ACTIVE'
            `, [id]);

            let migrationSum = 0;
            let realPaymentSum = 0;

            console.log("Allocated Payments:");
            allocs.rows.forEach(p => {
                if (p.transaction_ref === 'MIGRATION') {
                    migrationSum += parseFloat(p.a_amt);
                    console.log(`  [MIGRATION] Alloc: ${p.a_amt} | PayID: ${p.p_id} | Ref: ${p.transaction_ref}`);
                } else {
                    realPaymentSum += parseFloat(p.a_amt);
                    console.log(`  [REAL PAY] Alloc: ${p.a_amt} | PayID: ${p.p_id} | Ref: ${p.transaction_ref} | Status: ${p.p_status}`);
                }
            });

            // 2. Get Advances
            const advances = await pool.query("SELECT amount FROM advance_utilizations WHERE invoice_id = $1", [id]);
            let advSum = 0;
            advances.rows.forEach(a => { advSum += parseFloat(a.amount); });
            if (advSum > 0) console.log(`  [ADVANCE] Total Utilized: ${advSum}`);

            // 3. Get Returns
            const returns = await pool.query("SELECT grand_total FROM sales_returns WHERE invoice_id = $1 AND status = 'Applied'", [id]);
            let retSum = 0;
            returns.rows.forEach(r => { retSum += parseFloat(r.grand_total); });
            if (retSum > 0) console.log(`  [RETURN] Total Credits: ${retSum}`);

            const totalTruth = migrationSum + realPaymentSum + advSum + retSum;
            console.log(`Total Combined: ${totalTruth}`);

            // 4. Comparison
            if (migrationSum != supposed) {
                console.log(`🚨 MIGRATION DISCREPANCY: System has ${migrationSum}, but Supposed to be ${supposed}. (Diff: ${migrationSum - supposed})`);
            } else {
                console.log(`✅ MIGRATION MATCHES: System MIGRATION matches your "Supposed" value.`);
            }

        } catch (err) {
            console.error(err);
        }
    }
    await pool.end();
}

audit();
