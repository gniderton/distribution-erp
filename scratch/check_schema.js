const { pool } = require('../config/db');

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type, is_generated, generation_expression 
            FROM information_schema.columns 
            WHERE table_name = 'sales_invoices' 
            AND column_name IN ('paid_amount', 'balance_amount', 'status');
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSchema();
