const { pool } = require('./config/db');

async function check() {
    const ids = [27, 28, 25, 26, 87, 90];
    try {
        const r = await pool.query('SELECT id, particulars, debit_amount, credit_amount, amount FROM bank_statement_entries WHERE id = ANY($1)', [ids]);
        console.table(r.rows);
    } catch (e) {
        console.error("Check Failed:", e.message);
    } finally {
        pool.end();
    }
}

check();
