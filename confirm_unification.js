const { pool } = require('./config/db');

async function confirmUnification() {
    try {
        console.log('🕵️ ANALYZING LEDGER FOR BANK UNIFICATION...');
        
        // Check distribution across potential bank COA IDs
        const res = await pool.query(`
            SELECT account_id, count(*) as entry_count 
            FROM journal_lines 
            WHERE account_id IN (2, 1102, 1103, 4453, 4454) -- 2 is Unified, others are old/forensic
            GROUP BY account_id
        `);
        
        console.log('\n--- LEDGER DISTRIBUTION ---');
        console.table(res.rows);

        const unifiedTotal = res.rows.find(r => r.account_id == '2')?.entry_count || 0;
        const others = res.rows.filter(r => r.account_id != '2').reduce((acc, curr) => acc + parseInt(curr.entry_count), 0);

        if (others === 0 && unifiedTotal > 0) {
            console.log('\n✅ ARCHITECTURE CONFIRMED: 100% of bank entries are in the Unified Account (ID 2).');
        } else if (others > 0) {
            console.log(`\n⚠️ DISCREPANCY: Found ${others} entries still sitting in old bank accounts.`);
        } else {
            console.log('\n❓ No bank entries found in the specified IDs.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

confirmUnification();
