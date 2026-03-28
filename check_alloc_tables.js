const { pool } = require('./config/db');

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('payment_allocations', 'customer_payment_allocations')
            ORDER BY table_name, ordinal_position
        `);
        console.log('Schema Comparison:');
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
