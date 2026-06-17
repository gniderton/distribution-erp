const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable'
});

async function findSpecificBounces() {
    const client = await pool.connect();
    try {
        const targets = [
            { no: '075591', amt: 26339.00 },
            { no: '325667', amt: 8974.00 },
            { no: '680934', amt: 4634.00 }
        ];

        console.log('--- Searching for Specific Bounce Pairs ---');
        
        for (const t of targets) {
            console.log(`\nSearching for Cheque #${t.no} (Amount: ${t.amt})...`);
            
            // Find ALL entries with this amount
            const entries = await client.query(`
                SELECT id, amount, transaction_date, particulars, credit_amount, debit_amount, status
                FROM bank_statement_entries 
                WHERE amount = $1
                ORDER BY transaction_date DESC
            `, [t.amt]);

            if (entries.rows.length > 0) {
                entries.rows.forEach(r => {
                    const type = r.credit_amount > 0 ? 'CREDIT (Deposit)' : 'DEBIT (Bounce)';
                    console.log(`   [${type}] ID: ${r.id} | Date: ${r.transaction_date.toISOString().split('T')[0]} | Status: ${r.status} | ${r.particulars}`);
                });
            } else {
                console.log('   ❌ No matching entries found for this amount.');
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

findSpecificBounces();
