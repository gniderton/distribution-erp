const { pool } = require('./config/db');

async function check() {
    try {
        const res = await pool.query("SELECT * FROM document_sequences");
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    }
}
check();
