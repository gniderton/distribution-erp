
const { pool } = require('./config/db');

async function findInvoiceJEs() {
    try {
        const invIds = [16, 17, 742];
        const res = await pool.query('SELECT id, description, reference_type, reference_id, transaction_date FROM journal_entries WHERE reference_id = ANY($1)', [invIds]);
        
        console.table(res.rows);

        const descRes = await pool.query(`
            SELECT id, description, transaction_date 
            FROM journal_entries 
            WHERE description ILIKE ANY($1)
        `, [['%GIV-26-7659%', '%GIV-26-7667%', '%PEN-26-00001%']]);
        
        console.log('--- Matches by Description ---');
        console.table(descRes.rows);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

findInvoiceJEs();
