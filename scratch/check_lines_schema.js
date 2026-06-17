const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable'
});

async function checkSchema() {
    const client = await pool.connect();
    try {
        console.log('--- Columns in sales_invoice_lines ---');
        const resLines = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'sales_invoice_lines'
        `);
        console.log(resLines.rows);

        console.log('\n--- Columns in sales_return_lines ---');
        const resReturns = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'sales_return_lines'
        `);
        console.log(resReturns.rows);
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkSchema();
