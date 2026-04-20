const { pool } = require('../config/db');

async function syncInventoryLedger() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("1. Reverting broad 'RETURN' tags...");
        // Only mark as MIGRATION if it has no GRN and no Return link
        await client.query(`
            UPDATE inventory_batches 
            SET source_type = 'MIGRATION' 
            WHERE grn_id IS NULL 
              AND id NOT IN (SELECT batch_id FROM sales_return_lines)
        `);

        console.log("2. Calculating Ground Truth vs Ledger...");
        const batchRes = await client.query(`
            SELECT SUM(quantity_remaining * purchase_rate) as total_value 
            FROM inventory_batches 
            WHERE quantity_remaining > 0
        `);
        const groundTruth = parseFloat(batchRes.rows[0].total_value);

        const ledgerRes = await client.query(`
            SELECT SUM(jl.debit - jl.credit) as balance 
            FROM journal_lines jl 
            JOIN chart_of_accounts coa ON jl.account_id = coa.id 
            WHERE coa.code = 1001
        `);
        const ledgerBalance = parseFloat(ledgerRes.rows[0].balance || 0);

        const diff = groundTruth - ledgerBalance;
        console.log(`Ground Truth: ${groundTruth}, Ledger: ${ledgerBalance}, Difference: ${diff}`);

        if (Math.abs(diff) > 1) {
            console.log("3. Creating Inventory Adjustment Entry...");
            
            const invAcc = await client.query("SELECT id FROM chart_of_accounts WHERE code = 1001");
            const offsetAcc = await client.query("SELECT id FROM chart_of_accounts WHERE code = 3999");

            const jeRes = await client.query(`
                INSERT INTO journal_entries (description, transaction_date, reference_type) 
                VALUES ($1, CURRENT_DATE, 'ADJUSTMENT') 
                RETURNING id
            `, [`Inventory Value Reconciliation: Batch vs Ledger Sync`]);
            
            const jeId = jeRes.rows[0].id;

            if (diff > 0) {
                // Debit Inventory, Credit Offset
                await client.query(`INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES ($1, $2, $3, 0), ($1, $4, 0, $3)`, 
                    [jeId, invAcc.rows[0].id, diff, offsetAcc.rows[0].id]);
            } else {
                // Credit Inventory, Debit Offset
                await client.query(`INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES ($1, $2, 0, $3), ($1, $4, $3, 0)`, 
                    [jeId, invAcc.rows[0].id, Math.abs(diff), offsetAcc.rows[0].id]);
            }
            console.log("Adjustment entry created successfully.");
        } else {
            console.log("Inventory is already in sync.");
        }

        await client.query('COMMIT');
        console.log("DONE.");
        process.exit(0);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        process.exit(1);
    } finally {
        client.release();
    }
}

syncInventoryLedger();
