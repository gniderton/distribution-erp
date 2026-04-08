const { pool } = require('./config/db');

async function checkSchema() {
    try {
        console.log('--- sales_invoice_lines Table Columns ---');
        const silRes = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'sales_invoice_lines' 
            ORDER BY ordinal_position
        `);
        console.table(silRes.rows);

        console.log('\n--- customers Table Columns ---');
        const cRes = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'customers' 
            ORDER BY ordinal_position
        `);
        console.table(cRes.rows);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkSchema();
