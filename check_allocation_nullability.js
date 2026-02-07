const { pool } = require('./config/db');

async function check() {
    try {
        const res = await pool.query(`
            SELECT column_name, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'payment_allocations'
            AND column_name = 'purchase_invoice_id'
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
