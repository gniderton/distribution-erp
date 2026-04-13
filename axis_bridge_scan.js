const { pool } = require('./config/db');
async function scan() {
    try {
        console.log('🕵️ SCANNING FOR AXIS BRIDGE LINKS...');
        const res = await pool.query(`
            SELECT bse.bank_name, COUNT(*), SUM(cp.amount) as total
            FROM customer_payments cp
            JOIN bank_statement_entries bse ON cp.bank_statement_entry_id = bse.id
            WHERE bse.bank_name ILIKE '%Axis%'
            GROUP BY bse.bank_name
        `);
        console.table(res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
scan();
