const { pool } = require('./config/db');

async function run() {
    try {
        const res = await pool.query(`
            SELECT 
                ca.id as advance_id,
                ca.amount as initial_amount,
                ca.balance as current_balance,
                ca.is_active,
                COALESCE((SELECT SUM(amount) FROM advance_utilizations au WHERE au.advance_id = ca.id), 0) as total_utilized
            FROM customer_advances ca
            ORDER BY ca.id DESC
            LIMIT 20
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
