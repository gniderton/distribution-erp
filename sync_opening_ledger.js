const { pool } = require('./config/db');

async function syncLedger() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log("🚀 Syncing Opening Inventory Ledger with all migrated batches...");

        // 1. Calculate current total value of all Opening Stock
        const valRes = await client.query(`
            SELECT COALESCE(SUM(quantity_initial * purchase_rate), 0) as total_value 
            FROM inventory_batches 
            WHERE grn_id IS NULL
        `);
        const totalValue = parseFloat(valRes.rows[0].total_value);
        console.log(`📊 Calculated Total Opening Stock Value: ₹${totalValue.toLocaleString()}`);

        // 2. Identify or Create the Master Opening Journal Entry
        const masterDesc = 'Opening Migration: Inventory Catch-up';
        let jeRes = await client.query("SELECT id FROM journal_entries WHERE description = $1", [masterDesc]);
        
        let journalEntryId;
        if (jeRes.rows.length > 0) {
            journalEntryId = jeRes.rows[0].id;
            console.log(`🔗 Found existing Master Entry: JE #${journalEntryId}`);
        } else {
            const newJe = await client.query(
                "INSERT INTO journal_entries (transaction_date, description, reference_type) VALUES (NOW(), $1, 'MIGRATION') RETURNING id",
                [masterDesc]
            );
            journalEntryId = newJe.rows[0].id;
            console.log(`🆕 Created new Master Entry: JE #${journalEntryId}`);
        }

        // 3. Resolve Account IDs
        const accRes = await client.query("SELECT id, code FROM chart_of_accounts WHERE code IN (1001, 3999)");
        const invAccId = accRes.rows.find(a => a.code == 1001)?.id;
        const offsetAccId = accRes.rows.find(a => a.code == 3999)?.id;

        if (invAccId && offsetAccId) {
            // Delete old lines and insert fresh ones for this entry
            await client.query("DELETE FROM journal_lines WHERE journal_entry_id = $1", [journalEntryId]);
            
            await client.query(`
                INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
                VALUES ($1, $2, $3, 0), ($1, $4, 0, $3)
            `, [journalEntryId, invAccId, totalValue, offsetAccId]);
            console.log("✅ Journal Lines updated successfully.");
        } else {
            throw new Error("Could not find Chart of Account IDs for 1001 or 3999");
        }

        await client.query('COMMIT');
        console.log(`\n✨ SUCCESS: Your ledger is now synced with all ${totalValue > 0 ? 'items imported yesterday and previously.' : 'available batches.'}`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Sync Error:", err);
    } finally {
        process.exit();
    }
}

syncLedger();
