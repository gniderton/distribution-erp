const { pool } = require('./config/db');

async function findTables() {
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name ILIKE '%customer%' 
               OR table_name ILIKE '%address%'
        `);
        console.log('--- Relevant Tables ---');
        console.log(res.rows.map(r => r.table_name).join(', '));

        // Check if there is a 'customer_addresses' table
        const res2 = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'customer_addresses'
        `);
        if (res2.rows.length > 0) {
            console.log('\n--- customer_addresses columns ---');
            console.log(res2.rows.map(r => r.column_name).join(', '));
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

findTables();
