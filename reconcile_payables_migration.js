const { pool } = require('./config/db');

async function reconcilePayables() {
    console.log("--- Starting Forensic Payables Reconciliation ---");
    
    // 1. Calculate Totals
    const billsRes = await pool.query(`
        SELECT COALESCE(SUM(grand_total), 0) as total 
        FROM purchase_invoice_headers 
        WHERE (vendor_invoice_number IS NULL OR vendor_invoice_number = '') AND purchase_order_id IS NULL
    `);
    const totalPayables = parseFloat(billsRes.rows[0].total);

    const payRes = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM vendor_payments 
        WHERE transaction_ref ILIKE '%MIGRATION%' AND is_active = true
    `);
    const totalPayments = parseFloat(payRes.rows[0].total);

    console.log(`Totals Calculated: Bills = ${totalPayables}, Vendor Payments = ${totalPayments}`);

    // Account IDs (Safe fetch) (2001 Accounts Payable, 3999 Suspense)
    const coaRes = await pool.query("SELECT id, code FROM chart_of_accounts WHERE code IN (2001, 3999)");
    const accMap = {};
    coaRes.rows.forEach(r => accMap[r.code] = r.id);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // --- Entry A: Opening Payables ---
        const entryA = await client.query(`
            INSERT INTO journal_entries (transaction_date, description, reference_type, reference_id)
            VALUES ('2026-04-01', 'Opening Migration: Payables Catch-up', 'MIGRATION', '0')
            RETURNING id
        `);
        const entryIdA = entryA.rows[0].id;

        await client.query(`
            INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
            VALUES 
                ($1, $2, $3, 0), -- Debit Suspense (3999)
                ($1, $4, 0, $3)  -- Credit Accounts Payable (2001)
        `, [entryIdA, accMap[3999], totalPayables, accMap[2001]]);

        // --- Entry B: Migrated Vendor Payments ---
        const entryB = await client.query(`
            INSERT INTO journal_entries (transaction_date, description, reference_type, reference_id)
            VALUES ('2026-04-01', 'Opening Migration: Migrated Vendor Payments Catch-up', 'MIGRATION', '0')
            RETURNING id
        `);
        const entryIdB = entryB.rows[0].id;

        await client.query(`
            INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
            VALUES 
                ($1, $2, $3, 0), -- Debit Accounts Payable (2001)
                ($1, $4, 0, $3)  -- Credit Suspense (3999)
        `, [entryIdB, accMap[2001], totalPayments, accMap[3999]]);

        await client.query('COMMIT');
        console.log(`SUCCESS: Created Journal Entry IDs ${entryIdA} and ${entryIdB}`);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("FAILED to reconcile payables:", e.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

reconcilePayables();
