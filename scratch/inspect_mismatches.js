const { pool } = require('../config/db');

async function run() {
    try {
        const mismatches = [18, 10, 17, 9, 11, 26, 13];
        
        for (const vId of mismatches) {
            console.log(`\n========================================`);
            console.log(`VENDOR ID: ${vId}`);
            console.log(`========================================`);
            
            // 1. Get Vendor Name
            const vRes = await pool.query("SELECT vendor_name FROM vendors WHERE id = $1", [vId]);
            console.log("Name:", vRes.rows[0]?.vendor_name);

            // 2. Sum Invoices in Ledger vs Aging
            const invLedger = await pool.query(`
                SELECT SUM(grand_total) as total, COUNT(*) as count 
                FROM purchase_invoice_headers 
                WHERE vendor_id = $1 AND status <> 'Cancelled'
            `, [vId]);
            const invReversed = await pool.query(`
                SELECT SUM(grand_total) as total, COUNT(*) as count 
                FROM purchase_invoice_headers 
                WHERE vendor_id = $1 AND status = 'Reversed'
            `, [vId]);
            console.log(`Invoices in Ledger (status <> 'Cancelled'): ${invLedger.rows[0].total} (Count: ${invLedger.rows[0].count})`);
            console.log(`  of which are 'Reversed': ${invReversed.rows[0].total} (Count: ${invReversed.rows[0].count})`);

            // 3. Sum Payments in Ledger vs Allocations
            const payLedger = await pool.query(`
                SELECT SUM(amount) as total, COUNT(*) as count 
                FROM vendor_payments 
                WHERE vendor_id = $1 AND is_active = true
            `, [vId]);
            const payAlloc = await pool.query(`
                SELECT SUM(pa.amount) as total, COUNT(DISTINCT pa.payment_id) as count
                FROM payment_allocations pa
                JOIN vendor_payments vp ON pa.payment_id = vp.id
                WHERE vp.vendor_id = $1 AND vp.is_active = true
            `, [vId]);
            const unallocPay = parseFloat(payLedger.rows[0].total || 0) - parseFloat(payAlloc.rows[0].total || 0);
            console.log(`Payments in Ledger (is_active = true): ${payLedger.rows[0].total} (Count: ${payLedger.rows[0].count})`);
            console.log(`Payments allocated: ${payAlloc.rows[0].total} (Count: ${payAlloc.rows[0].count})`);
            console.log(`Unallocated Payments: ${unallocPay.toFixed(2)}`);

            // 4. Sum Debit Notes in Ledger vs Allocations
            const dnLedger = await pool.query(`
                SELECT SUM(amount) as total, COUNT(*) as count 
                FROM debit_notes 
                WHERE vendor_id = $1 AND status = 'Approved' AND note_type = 'Debit Note'
            `, [vId]);
            const dnAllApproved = await pool.query(`
                SELECT SUM(amount) as total, COUNT(*) as count, note_type
                FROM debit_notes 
                WHERE vendor_id = $1 AND status = 'Approved'
                GROUP BY note_type
            `, [vId]);
            console.log("All Approved Debit Notes in DB (by note_type):");
            console.table(dnAllApproved.rows);

            const dnAlloc = await pool.query(`
                SELECT SUM(dna.amount) as total, COUNT(DISTINCT dna.debit_note_id) as count
                FROM debit_note_allocations dna
                JOIN debit_notes dn ON dna.debit_note_id = dn.id
                WHERE dn.vendor_id = $1 AND dn.status = 'Approved'
            `, [vId]);
            console.log(`Debit Notes in Ledger (Approved & note_type = 'Debit Note'): ${dnLedger.rows[0].total} (Count: ${dnLedger.rows[0].count})`);
            console.log(`Debit Notes allocated: ${dnAlloc.rows[0].total} (Count: ${dnAlloc.rows[0].count})`);

            // List any unallocated approved debit notes
            const unallocDN = await pool.query(`
                SELECT id, debit_note_number, amount, note_type, reason
                FROM debit_notes
                WHERE vendor_id = $1 AND status = 'Approved'
                  AND id NOT IN (SELECT debit_note_id FROM debit_note_allocations)
            `, [vId]);
            if (unallocDN.rows.length > 0) {
                console.log("Unallocated Approved Debit Notes:");
                console.table(unallocDN.rows);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
