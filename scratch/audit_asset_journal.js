const { pool } = require('../config/db');

async function auditAssets() {
    try {
        console.log('--- Assets ---');
        const assets = await pool.query('SELECT * FROM assets ORDER BY id DESC LIMIT 5');
        console.table(assets.rows);

        if (assets.rows.length > 0) {
            const assetId = assets.rows[0].id;
            console.log(`--- Journal Entries for Asset ID ${assetId} ---`);
            const journal = await pool.query("SELECT * FROM journal_entries WHERE reference_type = 'ASSET_PURCHASE' AND reference_id = $1", [assetId]);
            console.table(journal.rows);

            if (journal.rows.length > 0) {
                const journalId = journal.rows[0].id;
                console.log(`--- Ledger Lines for Journal ID ${journalId} ---`);
                const lines = await pool.query("SELECT * FROM journal_lines WHERE journal_entry_id = $1", [journalId]);
                console.table(lines.rows);
            }

            console.log(`--- Asset Transactions for Asset ID ${assetId} ---`);
            const trans = await pool.query("SELECT * FROM asset_transactions WHERE asset_id = $1", [assetId]);
            console.table(trans.rows);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

auditAssets();
