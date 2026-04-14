const { pool } = require('./config/db');

async function auditDse() {
    try {
        const res = await pool.query("SELECT * FROM dse_expenses LIMIT 1");
        console.log('DSE EXPENSES KEYS:', Object.keys(res.rows[0]));
    } catch (e) {
        console.error(e.message);
    } finally {
        process.exit();
    }
}

auditDse();
