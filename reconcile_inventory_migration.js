const { pool } = require('./config/db');

async function reconcileInventory() {
    console.log("--- Starting Forensic Inventory Reconciliation ---");
    
    // 1. Calculate Total Valuation (Opening)
    const invRes = await pool.query(`
        SELECT COALESCE(SUM(quantity_initial * purchase_rate), 0) as total 
        FROM inventory_batches 
        WHERE grn_id IS NULL
    `);
    const totalInventory = parseFloat(invRes.rows[0].total);

    console.log(`Inventory Valuation Calculated: ₹${totalInventory}`);

    // Account IDs (Safe fetch)
    const coaRes = await pool.query("SELECT id, code FROM chart_of_accounts WHERE code IN (1001, 3999)");
    const accMap = {};
    coaRes.rows.forEach(r => accMap[r.code] = r.id);

    if (!accMap[1001] || !accMap[3999]) {
        console.error("CRITICAL: Missing accounts in Chart of Accounts (1001 or 3999)");
        process.exit(1);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // --- Entry: Opening Inventory ---
        const entry = await client.query(`
            INSERT INTO journal_entries (transaction_date, description, reference_type, reference_id)
            VALUES ('2026-04-01', 'Opening Migration: Inventory Catch-up', 'MIGRATION', '0')
            RETURNING id
        `);
        const entryId = entry.rows[0].id;

        await client.query(`
            INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
            VALUES 
                ($1, $2, $3, 0), -- Debit Inventory (1001)
                ($1, $4, 0, $3)  -- Credit Suspense (3999)
        `, [entryId, accMap[1001], totalInventory, accMap[3999]]);

        await client.query('COMMIT');
        console.log(`SUCCESS: Created Journal Entry ID ${entryId} for Inventory`);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("FAILED to reconcile inventory:", e.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

reconcileInventory();
