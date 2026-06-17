const { pool } = require('../config/db');

async function auditAccounts() {
    try {
        const accounts = [
            { name: 'Cash (1)', id: 1, isBank: false },
            { name: 'Axis (2)', id: 2, isBank: true },
            { name: 'IDFC (3)', id: 3, isBank: true },
            { name: 'Cheques (1004)', id: 1004, isBank: false }
        ];

        for (const acc of accounts) {
            const seedRes = await pool.query("SELECT SUM(amount) as seed FROM opening_balances WHERE account_id = $1", [acc.id]);
            const movementRes = await pool.query(`
                SELECT SUM(amount_in - amount_out) as movement 
                FROM view_unified_liquid_ledger v
                LEFT JOIN bank_statement_entries bse ON v.bank_statement_entry_id = bse.id
                WHERE ${acc.isBank ? '(v.direct_bank_id = $1 OR bse.bank_account_id = $1)' : 'v.liquid_account_id = $1'}
            `, [acc.id]);
            
            console.log(`Account: ${acc.name}`);
            console.log(`  Seed: ${seedRes.rows[0].seed}`);
            console.log(`  Movement: ${movementRes.rows[0].movement}`);
            console.log(`  Forensic Total: ${parseFloat(seedRes.rows[0].seed || 0) + parseFloat(movementRes.rows[0].movement || 0)}`);
        }

        const chqTableRes = await pool.query("SELECT status, SUM(amount) as total FROM cheques WHERE type = 'INCOMING' GROUP BY status");
        console.log("\n--- Cheques Table Source ---");
        console.table(chqTableRes.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

auditAccounts();
