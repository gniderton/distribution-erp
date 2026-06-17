const { pool } = require('../config/db');

async function run() {
    try {
        console.log("=== VIEW DEFINITION: view_vendor_ledger ===");
        const viewDef = await pool.query("SELECT pg_get_viewdef('view_vendor_ledger', true) as def");
        console.log(viewDef.rows[0].def);

        console.log("\n=== COMPARING LEDGER BALANCES VS AGING BALANCES ===");
        
        // 1. Get ledger balances per vendor
        const ledgerRes = await pool.query(`
            SELECT v.id as vendor_id, v.vendor_name, SUM(vl.credit_amount - vl.debit_amount) as ledger_balance
            FROM view_vendor_ledger vl 
            JOIN vendors v ON vl.vendor_id = v.id
            GROUP BY v.id, v.vendor_name
            ORDER BY v.vendor_name
        `);
        
        // 2. Get aging balances (grand_total - paid_amount - dn_amount) per vendor
        const agingRes = await pool.query(`
            SELECT 
                pi.vendor_id,
                v.vendor_name,
                SUM(
                    CASE 
                        WHEN pi.status IN ('Reversed', 'Cancelled') THEN 0.00
                        ELSE (pi.grand_total - COALESCE(pa.paid_amount, 0) - COALESCE(dn.dn_amount, 0))
                    END
                ) as aging_balance,
                SUM(pi.grand_total) as total_bill_amount,
                SUM(COALESCE(pa.paid_amount, 0)) as total_paid_amount,
                SUM(COALESCE(dn.dn_amount, 0)) as total_debit_note_amount
            FROM purchase_invoice_headers pi
            JOIN vendors v ON pi.vendor_id = v.id
            LEFT JOIN (
                SELECT purchase_invoice_id, SUM(amount) as paid_amount 
                FROM payment_allocations 
                GROUP BY purchase_invoice_id
            ) pa ON pi.id = pa.purchase_invoice_id
            LEFT JOIN (
                SELECT purchase_invoice_id, SUM(amount) as dn_amount 
                FROM debit_note_allocations 
                GROUP BY purchase_invoice_id
            ) dn ON pi.id = dn.purchase_invoice_id
            GROUP BY pi.vendor_id, v.vendor_name
            ORDER BY v.vendor_name
        `);

        console.log("\n--- LEDGER BALANCES ---");
        console.table(ledgerRes.rows);

        console.log("\n--- AGING BALANCES ---");
        console.table(agingRes.rows);

        // Compare them
        console.log("\n--- DISCREPANCIES ---");
        const ledgerMap = new Map(ledgerRes.rows.map(r => [String(r.vendor_id), parseFloat(r.ledger_balance || 0)]));
        const agingMap = new Map(agingRes.rows.map(r => [String(r.vendor_id), r]));

        for (const [vId, ledgerBal] of ledgerMap.entries()) {
            const agingData = agingMap.get(vId);
            const agingBal = agingData ? parseFloat(agingData.aging_balance || 0) : 0;
            const diff = ledgerBal - agingBal;
            if (Math.abs(diff) > 0.01) {
                console.log(`Vendor: ${agingData ? agingData.vendor_name : vId} (ID: ${vId})`);
                console.log(`  Ledger Balance: ${ledgerBal.toFixed(2)}`);
                console.log(`  Aging Balance : ${agingBal.toFixed(2)}`);
                console.log(`  Difference    : ${diff.toFixed(2)}`);
            }
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
