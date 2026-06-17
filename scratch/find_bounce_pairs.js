const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable'
});

async function findPairs() {
    const client = await pool.connect();
    try {
        console.log('--- Searching for Mirror Entries (Credit/Debit Pairs) ---');
        
        // Find unconsumed entries that have a mirror (same amount, opposite side)
        const resPairs = await client.query(`
            SELECT 
                a.id as credit_id, a.amount as credit_amount, a.transaction_date as credit_date, a.particulars as credit_particulars,
                b.id as debit_id, b.amount as debit_amount, b.transaction_date as debit_date, b.particulars as debit_particulars
            FROM bank_statement_entries a
            JOIN bank_statement_entries b ON a.amount = b.amount 
                AND a.credit_amount > 0 AND b.debit_amount > 0
                AND a.id != b.id
            WHERE a.status != 'Exhausted' AND b.status != 'Exhausted'
            ORDER BY a.transaction_date DESC
        `);

        console.log(`Found ${resPairs.rows.length} potential mirror pairs.\n`);

        const results = [];
        for (const pair of resPairs.rows) {
            // Find a cheque that matches this amount
            const resChq = await client.query(`
                SELECT id, cheque_number, party_type, amount, status 
                FROM cheques 
                WHERE amount = $1 AND (status = 'PENDING' OR status = 'BOUNCED')
                LIMIT 1
            `, [pair.credit_amount]);

            results.push({
                pair: {
                    credit: { id: pair.credit_id, date: pair.credit_date, particulars: pair.credit_particulars },
                    debit: { id: pair.debit_id, date: pair.debit_date, particulars: pair.debit_particulars },
                    amount: pair.credit_amount
                },
                cheque: resChq.rows[0] || null
            });
        }

        console.log(JSON.stringify(results, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

findPairs();
