const { pool } = require('./config/db');

async function findMatches() {
    try {
        console.log('🕵️ SEARCHING IDFC STATEMENT FOR EXPENSE MATCHES (April 2026)...');
        
        const targetAmounts = [18960.00, 11004.47, 3808.44, 1697.00];
        
        const res = await pool.query(`
            SELECT id, particulars, debit_amount, transaction_date, status
            FROM bank_statement_entries 
            WHERE bank_account_id = 3 
              AND transaction_date >= '2026-04-01'
              AND transaction_date <= '2026-04-10'
            ORDER BY transaction_date ASC
        `);
        
        console.log('\n--- PHYSICAL STATEMENT ROWS ---');
        console.table(res.rows);

        console.log('\n--- ANALYSIS ---');
        targetAmounts.forEach(amt => {
            const match = res.rows.find(r => parseFloat(r.debit_amount) === amt);
            if (match) {
                console.log(`✅ MATCH FOUND: Exp ₹${amt} -> Statement ID ${match.id} (${match.status})`);
            } else {
                console.log(`❌ NO MATCH: Exp ₹${amt}`);
            }
        });

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

findMatches();
