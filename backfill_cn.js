const { pool } = require('./config/db');

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const res = await client.query(`
            WITH unutilized_returns AS (
                SELECT 
                    sr.id as return_id,
                    sr.customer_id,
                    sr.grand_total,
                    COALESCE(SUM(cpa.amount), 0) as utilized_amount,
                    (sr.grand_total - COALESCE(SUM(cpa.amount), 0)) as remaining_amount,
                    sr.created_at
                FROM sales_returns sr
                LEFT JOIN customer_payment_allocations cpa ON sr.id = cpa.return_id AND cpa.status = 'ACTIVE'
                WHERE sr.status != 'Cancelled' 
                  AND sr.is_active = TRUE
                  AND NOT EXISTS (SELECT 1 FROM customer_advances ca WHERE ca.return_id = sr.id)
                GROUP BY sr.id, sr.customer_id, sr.grand_total, sr.created_at
                HAVING (sr.grand_total - COALESCE(SUM(cpa.amount), 0)) > 0.01
            )
            INSERT INTO customer_advances (customer_id, return_id, amount, balance, created_at, updated_at, is_active)
            SELECT 
                customer_id,
                return_id,
                remaining_amount,
                remaining_amount,
                created_at,
                NOW(),
                TRUE
            FROM unutilized_returns
            RETURNING *;
        `);
        
        await client.query('COMMIT');
        console.log(`Successfully backfilled ${res.rowCount} unutilized credit notes into customer_advances.`);
        console.table(res.rows.map(r => ({ advance_id: r.id, return_id: r.return_id, amount: r.amount })));
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error backfilling:', e);
    } finally {
        client.release();
        process.exit(0);
    }
}
run();
