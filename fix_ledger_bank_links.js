const { pool } = require('./config/db');

async function fixLedgerLinks() {
    try {
        // 1. Get Bank Account IDs (using bank_name column)
        const banksRes = await pool.query("SELECT id, bank_name FROM bank_accounts");
        const idfc = banksRes.rows.find(b => b.bank_name.includes('IDFC'));
        const axis = banksRes.rows.find(b => b.bank_name.includes('Axis'));

        if (!idfc || !axis) {
            console.error('❌ Could not find bank accounts by name.');
            console.log('Available Banks:', banksRes.rows);
            return;
        }

        console.log(`🔗 Linking IDFC (ID: ${idfc.id}) and Axis (ID: ${axis.id}) in Ledger...`);

        // 2. Update EVERY Journal Line for these accounts to ensure bank_account_id is SET
        const idfcUpdate = await pool.query(`
            UPDATE journal_lines 
            SET bank_account_id = $1 
            WHERE account_id = (SELECT id FROM chart_of_accounts WHERE code = '1002')
        `, [idfc.id]);

        const axisUpdate = await pool.query(`
            UPDATE journal_lines 
            SET bank_account_id = $1 
            WHERE account_id = (SELECT id FROM chart_of_accounts WHERE code = '1001')
        `, [axis.id]);

        console.log(`✅ Fixed ${idfcUpdate.rowCount} IDFC lines and ${axisUpdate.rowCount} Axis lines.`);

    } catch (err) {
        console.error('❌ Error fixing ledger links:', err.message);
    } finally {
        process.exit(0);
    }
}

fixLedgerLinks();
