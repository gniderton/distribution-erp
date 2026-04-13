const { pool } = require('./config/db');

async function reconcileSales() {
    console.log("--- Starting Forensic Sales Reconciliation ---");
    
    // 1. Calculate Totals
    const invRes = await pool.query(`
        SELECT COALESCE(SUM(grand_total), 0) as total 
        FROM sales_invoices 
        WHERE sales_order_id IS NULL AND status != 'Cancelled'
    `);
    const totalDebts = parseFloat(invRes.rows[0].total);

    const payRes = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM customer_payments 
        WHERE transaction_ref ILIKE '%MIGRATION%' AND status = 'Verified'
    `);
    const totalCredits = parseFloat(payRes.rows[0].total);

    console.log(`Totals Calculated: Invoices = ${totalDebts}, Payments = ${totalCredits}`);

    // Account IDs (Safe fetch)
    const coaRes = await pool.query("SELECT id, code FROM chart_of_accounts WHERE code IN (1101, 3999)");
    const accMap = {};
    coaRes.rows.forEach(r => accMap[r.code] = r.id);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // --- Entry A: Opening Receivables ---
        const entryA = await client.query(`
            INSERT INTO journal_entries (transaction_date, description, reference_type, reference_id)
            VALUES ('2026-04-01', 'Opening Migration: Receivables Catch-up', 'MIGRATION', '0')
            RETURNING id
        `);
        const entryIdA = entryA.rows[0].id;

        await client.query(`
            INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
            VALUES 
                ($1, $2, $3, 0), -- Debit Receivables (1101)
                ($1, $4, 0, $3)  -- Credit Suspense (3999)
        `, [entryIdA, accMap[1101], totalDebts, accMap[3999]]);

        // --- Entry B: Migrated Payments ---
        const entryB = await client.query(`
            INSERT INTO journal_entries (transaction_date, description, reference_type, reference_id)
            VALUES ('2026-04-01', 'Opening Migration: Applied Payments Catch-up', 'MIGRATION', '0')
            RETURNING id
        `);
        const entryIdB = entryB.rows[0].id;

        await client.query(`
            INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
            VALUES 
                ($1, $2, $3, 0), -- Debit Suspense (3999)
                ($1, $4, 0, $3)  -- Credit Receivables (1101)
        `, [entryIdB, accMap[3999], totalCredits, accMap[1101]]);

        await client.query('COMMIT');
        console.log(`SUCCESS: Created Journal Entry IDs ${entryIdA} and ${entryIdB}`);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("FAILED to reconcile:", e.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

reconcileSales();
