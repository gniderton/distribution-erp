const { pool } = require('./config/db');

async function check() {
    try {
        const res = await pool.query(`
            SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name 
            FROM information_schema.key_column_usage 
            WHERE table_name = 'assets' AND column_name = 'vendor_id'
        `);
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
