const { pool } = require('./config/db');
async function check() {
    try {
        const res = await pool.query(`
            SELECT conname, pg_get_constraintdef(c.oid) 
            FROM pg_constraint c 
            JOIN pg_class t ON c.conrelid = t.oid 
            WHERE t.relname = 'sales_invoices' AND c.contype = 'c'
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
