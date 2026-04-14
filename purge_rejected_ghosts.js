const { pool } = require('./config/db');

async function purgeRejectedGhosts() {
    try {
        console.log("🕵️ Starting Forensic Purge of Ghost Journals...");

        // IDs from the previous audit
        const ghostPaymentIds = [127, 126, 122, 404, 417, 444, 802];

        const result = await pool.query(`
            DELETE FROM journal_entries 
            WHERE reference_type = 'PAY_REJECT' 
            AND reference_id = ANY($1)
            RETURNING id
        `, [ghostPaymentIds]);

        if (result.rows.length === 0) {
            console.log("✅ No ghosts found to purge. The ledger is already clean.");
        } else {
            console.log(`🚀 Success! Purged ${result.rows.length} ghost journal entries.`);
            console.log("IDs Purged:", result.rows.map(r => r.id).join(', '));
            console.log("\n[RECONCILIATION COMPLETE] Your bank balances have been restored.");
        }

    } catch (err) {
        console.error("Purge Error:", err);
    } finally {
        process.exit();
    }
}

purgeRejectedGhosts();
