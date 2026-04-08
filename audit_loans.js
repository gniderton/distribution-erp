const { pool } = require('./config/db');
async function run() {
    try {
        const resLoans = await pool.query("SELECT * FROM information_schema.columns WHERE table_name = 'loans'");
        console.log("LOANS COLUMNS:");
        console.table(resLoans.rows.map(r => ({ column: r.column_name, type: r.data_type })));

        const resTrans = await pool.query("SELECT * FROM information_schema.columns WHERE table_name = 'loan_transactions'");
        console.log("LOAN_TRANSACTIONS COLUMNS:");
        console.table(resTrans.rows.map(r => ({ column: r.column_name, type: r.data_type })));

        const data = await pool.query("SELECT * FROM loans");
        console.log("CURRENT LOANS DATA:");
        console.table(data.rows);

    } catch(e) { console.error(e); }
    finally { pool.end(); }
}
run();
