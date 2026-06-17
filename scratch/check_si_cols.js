const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable'
});

async function checkSI() {
    const client = await pool.connect();
    try {
        console.log('--- Sales Invoices Columns ---');
        const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'sales_invoices'`);
        console.log(res.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkSI();
