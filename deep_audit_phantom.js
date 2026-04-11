const { pool } = require('./config/db');

async function audit() {
    const targetInvoiceIds = [38, 48, 19, 20, 23, 25, 26, 31, 51, 54, 55];
    
    console.log("Starting Deep Audit for Phantom Invoices...");
    
    for (const id of targetInvoiceIds) {
        try {
            console.log(`\n--- AUDITING INVOICE ID: ${id} ---`);
            
            // 1. Current Invoice State
            const inv = await pool.query("SELECT invoice_number, grand_total, amount_paid, status FROM sales_invoices WHERE id = $1", [id]);
            const row = inv.rows[0];
            if (!row) { console.log("Invoice not found!"); continue; }
            console.log(`Invoice: ${row.invoice_number} | Total: ${row.grand_total} | Saved Paid: ${row.amount_paid} | Status: ${row.status}`);

            // 2. Sum Allocations
            const allocs = await pool.query("SELECT SUM(amount) as total FROM customer_payment_allocations WHERE invoice_id = $1 AND status = 'ACTIVE'", [id]);
            const totalAlloc = parseFloat(allocs.rows[0].total || 0);

            // 3. Sum Advance Utilizations
            const adv = await pool.query("SELECT SUM(amount) as total FROM advance_utilizations WHERE invoice_id = $1", [id]);
            const totalAdv = parseFloat(adv.rows[0].total || 0);

            // 4. Sum Sales Returns
            const returns = await pool.query("SELECT SUM(grand_total) as total FROM sales_returns WHERE invoice_id = $1 AND status = 'Applied'", [id]);
            const totalRet = parseFloat(returns.rows[0].total || 0);

            const calculatedTotal = totalAlloc + totalAdv + totalRet;
            console.log(`Calculated Breakdown: Allocs(${totalAlloc}) + Advances(${totalAdv}) + Returns(${totalRet}) = ${calculatedTotal}`);

            // 5. Look for duplicates or discrepancies in parent payments
            const paymentDetails = await pool.query(`
                SELECT a.amount as alloc_amt, p.amount as pay_amt, p.payment_date, p.transaction_ref, p.status as p_status, p.id as p_id
                FROM customer_payment_allocations a
                JOIN customer_payments p ON a.payment_id = p.id
                WHERE a.invoice_id = $1 AND a.status = 'ACTIVE'
            `, [id]);
            
            if (paymentDetails.rows.length > 0) {
                console.log("Parent Payment Records:");
                paymentDetails.rows.forEach(p => {
                    console.log(`  - PayID: ${p.p_id} | Type: ${p.transaction_ref} | Pay Total: ${p.pay_amt} | Alloc Amt: ${p.alloc_amt} | Status: ${p.p_status}`);
                });
            }

            // 6. Check for Cheques
            const cheques = await pool.query(`
                SELECT c.amount, c.cheque_number, c.status 
                FROM cheques c
                JOIN customer_payments p ON p.id = c.customer_payment_id
                JOIN customer_payment_allocations a ON a.payment_id = p.id
                WHERE a.invoice_id = $1 AND a.status = 'ACTIVE'
            `, [id]);
            if (cheques.rows.length > 0) {
                console.log("Cheque Records:");
                cheques.rows.forEach(c => {
                    console.log(`  - Cheque# ${c.cheque_number} | Amount: ${c.amount} | Status: ${c.status}`);
                });
            }

            if (calculatedTotal != parseFloat(row.amount_paid)) {
                console.log(`!!! MISMATCH FOUND: Calculated(${calculatedTotal}) != Saved(${row.amount_paid})`);
            } else {
                console.log("OK: Calculation matches Saved amount_paid.");
            }

        } catch (err) {
            console.error(err);
        }
    }
    await pool.end();
}

audit();
