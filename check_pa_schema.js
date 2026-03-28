const { pool } = require('./config/db');

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'payment_allocations'
            ORDER BY ordinal_position
        `);
        console.log('Columns in payment_allocations:');
        console.table(r => r.rows); // wait, console.table(res.rows)
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
