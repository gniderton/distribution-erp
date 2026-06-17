const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable'
});

async function forensicCheck() {
    const client = await pool.connect();
    try {
        console.log('--- Deep Forensic Bank Statement Analysis ---');
        
        // 1. Find all Debit entries that mention "Bounce" or "Return"
        const bounceEntries = await client.query(`
            SELECT id, amount, transaction_date, particulars, debit_amount
            FROM bank_statement_entries 
            WHERE (particulars ILIKE '%bounce%' OR particulars ILIKE '%return%' OR particulars ILIKE '%rtn%' OR particulars ILIKE '%reject%')
              AND debit_amount > 0
              AND status != 'Exhausted'
            ORDER BY transaction_date DESC
        `);

        console.log(`Found ${bounceEntries.rows.length} potential bounce entries in statement.\n`);

        for (const debit of bounceEntries.rows) {
            console.log(`\nAnalyzing Debit: ID ${debit.id} | Amt: ${debit.amount} | Date: ${debit.transaction_date.toISOString().split('T')[0]} | ${debit.particulars}`);

            // 2. Find all possible matching Credits for this amount
            const possibleCredits = await client.query(`
                SELECT id, amount, transaction_date, particulars, credit_amount, status
                FROM bank_statement_entries
                WHERE amount = $1 AND credit_amount > 0
                  AND transaction_date <= $2 -- Deposit must be on or before bounce
                ORDER BY transaction_date DESC
            `, [debit.amount, debit.transaction_date]);

            if (possibleCredits.rows.length === 0) {
                console.log('   ❌ No matching Credit entry found.');
            } else {
                console.log(`   Found ${possibleCredits.rows.length} possible matching Credit(s):`);
                possibleCredits.rows.forEach(c => {
                    console.log(`   - ID ${c.id} | Date: ${c.transaction_date.toISOString().split('T')[0]} | Status: ${c.status} | ${c.particulars}`);
                });
            }

            // 3. Search for Cheque Number in particulars
            const chqMatch = debit.particulars.match(/\d{4,10}/); // Look for 4-10 digit numbers
            if (chqMatch) {
                const chqNo = chqMatch[0];
                console.log(`   🔍 Searching for Cheque No: ${chqNo}`);
                const resChq = await client.query(`
                    SELECT id, cheque_number, status, amount, party_type 
                    FROM cheques 
                    WHERE cheque_number LIKE '%' || $1 || '%'
                `, [chqNo]);
                
                if (resChq.rows.length > 0) {
                    resChq.rows.forEach(q => {
                        console.log(`   ✅ Match in Cheques Table: ID ${q.id} | No: ${q.cheque_number} | Status: ${q.status} | Amt: ${q.amount}`);
                    });
                } else {
                    console.log(`   ❌ No cheque found with number matching ${chqNo}`);
                }
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

forensicCheck();
