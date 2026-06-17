const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable'
});

async function check() {
    const client = await pool.connect();
    try {
        console.log('--- Checking Transaction 22 ---');
        const resTrans = await client.query('SELECT * FROM loan_transactions WHERE id = 22');
        console.log(resTrans.rows);

        console.log('\n--- Checking Bank Entry 1216 ---');
        const res1216 = await client.query('SELECT id, amount, consumed_amount, status FROM bank_statement_entries WHERE id = 1216');
        console.log(res1216.rows);

        console.log('\n--- Checking Bank Entry 1390 ---');
        const res1390 = await client.query('SELECT id, amount, consumed_amount, status FROM bank_statement_entries WHERE id = 1390');
        console.log(res1390.rows);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

check();
