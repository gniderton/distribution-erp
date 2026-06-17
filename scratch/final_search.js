const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable'
});

async function finalSearch() {
    const client = await pool.connect();
    try {
        console.log('--- Searching for Amount 26339 ---');
        const resAmt = await client.query(`SELECT id, amount, transaction_date, particulars FROM bank_statement_entries WHERE amount = 26339`);
        console.log(resAmt.rows);

        console.log('\n--- Searching for "Ayyappa" ---');
        const resName = await client.query(`SELECT id, amount, transaction_date, particulars FROM bank_statement_entries WHERE particulars ILIKE '%Ayyappa%'`);
        console.log(resName.rows);

        console.log('\n--- Checking Entries around 15/04/2026 ---');
        const resDate = await client.query(`
            SELECT id, amount, particulars, credit_amount, debit_amount 
            FROM bank_statement_entries 
            WHERE transaction_date >= '2026-04-14' AND transaction_date <= '2026-04-17'
            ORDER BY amount DESC
        `);
        console.log(resDate.rows);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

finalSearch();
