const { pool } = require('../config/db');
async function run() {
    const tables = ['employee_targets', 'employee_daily_achievement', 'employees'];
    for (const table of tables) {
        const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`, [table]);
        console.log(`Table: ${table}`);
        console.table(res.rows);
    }
    process.exit();
}
run();
