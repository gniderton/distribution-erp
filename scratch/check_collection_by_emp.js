const { pool } = require('../config/db');

async function checkCollection() {
    try {
        const res = await pool.query(`
            SELECT collected_by, COUNT(*) as total, 
                   SUM(CASE WHEN verification_status = 'Verified' THEN 1 ELSE 0 END) as verified_count,
                   SUM(CASE WHEN status = 'Verified' THEN 1 ELSE 0 END) as status_verified_count
            FROM customer_payments 
            GROUP BY collected_by
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkCollection();
