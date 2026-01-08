const { pool } = require('../config/db');

async function check() {
    try {
        console.log('--- Checking Debit Notes ---');
        const res = await pool.query('SELECT * FROM debit_notes ORDER BY created_at DESC LIMIT 5');
        console.table(res.rows);

        console.log('--- Checking Sequence ---');
        const seq = await pool.query("SELECT * FROM document_sequences WHERE document_type = 'DN'");
        console.table(seq.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
