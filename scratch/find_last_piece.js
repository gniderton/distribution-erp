const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable'
});

async function find075591() {
    const client = await pool.connect();
    try {
        console.log('--- Searching for Cheque #075591 in Statement ---');
        const res = await client.query(`
            SELECT id, amount, transaction_date, particulars, credit_amount, debit_amount, status
            FROM bank_statement_entries 
            WHERE particulars LIKE '%075591%'
        `);
        console.log(res.rows);

        console.log('\n--- Checking Entry 1390 Details ---');
        const res1390 = await client.query(`SELECT id, amount, particulars FROM bank_statement_entries WHERE id = 1390`);
        console.log(res1390.rows);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

find075591();
