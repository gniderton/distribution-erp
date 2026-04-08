const { pool } = require('./config/db');

async function check() {
    const ids = [90, 166, 89, 165, 87, 164];
    try {
        const r = await pool.query('SELECT id, bank_account_id, transaction_date, particulars, amount, debit_amount, credit_amount FROM bank_statement_entries WHERE id = ANY($1)', [ids]);
        console.table(r.rows);
    } catch (e) {
        console.error("Check Failed:", e.message);
    } finally {
        pool.end();
    }
}

check();
