
const { pool } = require('./config/db');

async function findJEs() {
    try {
        const invIds = [16, 17, 742];
        const chqIds = [49, 50];
        
        const res = await pool.query(`
            SELECT id, reference_type, reference_id, transaction_date 
            FROM journal_entries 
            WHERE (reference_type = 'SALES_INV' AND reference_id = ANY($1)) 
               OR (reference_type IN ('CHQ_BOUNCE_REV','CHQ_BOUNCE_FEE','CHQ_BOUNCE_PENALTY') AND reference_id = ANY($2))
        `, [invIds, chqIds]);

        console.table(res.rows);
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

findJEs();
