const { pool } = require('./config/db');

async function check() {
    try {
        const tables = ['brands', 'categories', 'taxes', 'hsn_codes'];
        for (const t of tables) {
            const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${t}'`);
            console.log(`\n--- ${t} ---`);
            console.table(res.rows);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
