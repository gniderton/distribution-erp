const { pool } = require('./config/db');

async function check() {
    const ids = [90, 87, 26, 27, 28, 29];
    try {
        const r = await pool.query('SELECT id, bank_name, particulars, debit_amount, credit_amount, amount, transaction_date FROM bank_statement_entries WHERE id = ANY($1)', [ids]);
        console.table(r.rows);
    } catch (e) {
        console.error("Check Failed:", e.message);
    } finally {
        pool.end();
    }
}

check();
