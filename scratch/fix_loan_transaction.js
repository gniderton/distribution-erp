const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable'
});

async function fix() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('1. Updating loan_transactions (id: 22)...');
        await client.query(`
            UPDATE loan_transactions 
            SET bank_statement_entry_id = 1390 
            WHERE id = 22
        `);

        console.log('2. Resetting bank_statement_entries (id: 1216)...');
        await client.query(`
            UPDATE bank_statement_entries 
            SET consumed_amount = 0.00, 
                status = 'Available'
            WHERE id = 1216
        `);

        console.log('3. Consuming bank_statement_entries (id: 1390)...');
        // Amount is 7826.50. Entry 1390 total is 8215.64.
        await client.query(`
            UPDATE bank_statement_entries 
            SET consumed_amount = 7826.50, 
                status = 'Partially Consumed'
            WHERE id = 1390
        `);

        await client.query('COMMIT');
        console.log('✅ Fix successful! Transaction 22 is now linked to Bank Entry 1390.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error during fix:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

fix();
