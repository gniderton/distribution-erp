const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable'
});

async function checkCheque() {
    const client = await pool.connect();
    try {
        console.log('--- Checking Cheque #075591 ---');
        const res = await client.query(`SELECT * FROM cheques WHERE cheque_number LIKE '%075591%'`);
        console.log(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkCheque();
