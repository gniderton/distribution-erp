const { pool } = require('./config/db');

async function checkRow() {
    try {
        const res = await pool.query("SELECT * FROM bank_statement_entries WHERE id = 2045");
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkRow();
