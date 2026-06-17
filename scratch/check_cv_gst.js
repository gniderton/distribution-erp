const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable'
});

async function checkCustVend() {
    const client = await pool.connect();
    try {
        console.log('--- Customers Columns ---');
        const resC = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'customers'`);
        console.log(resC.rows.map(r => r.column_name));

        console.log('\n--- Vendors Columns ---');
        const resV = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'vendors'`);
        console.log(resV.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkCustVend();
