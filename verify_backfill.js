const { pool } = require('./config/db');
async function run() {
    try {
        const res = await pool.query("SELECT lt.*, l.loan_number FROM loan_transactions lt JOIN loans l ON lt.loan_id = l.id WHERE l.loan_number = 'LOAN-00002'");
        console.table(res.rows);
    } catch(e) { console.error(e); }
    finally { pool.end(); }
}
run();
