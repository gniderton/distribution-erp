const { pool } = require('../config/db');
async function run() {
    const tables = ['payments', 'payment_allocations'];
    for (const t of tables) {
        const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [t]);
        console.log(`Table: ${t}`);
        console.table(res.rows);
    }
    process.exit();
}
run();
