const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable'
});

async function checkSRStatus() {
    const client = await pool.connect();
    try {
        console.log('--- Sales Return Status Counts ---');
        const res = await client.query(`SELECT status, count(*) FROM sales_returns GROUP BY status`);
        console.log(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkSRStatus();
