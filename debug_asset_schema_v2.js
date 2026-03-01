const { pool } = require('./config/db');

async function check() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'assets' ORDER BY column_name");
        res.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

check();
