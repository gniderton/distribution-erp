const { pool } = require('./config/db');

async function run() {
    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT trigger_name, event_manipulation, event_object_table, action_statement
            FROM information_schema.triggers
            WHERE event_object_table = 'customer_payments'
        `);
        console.table(res.rows);
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
