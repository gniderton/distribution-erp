const { pool } = require('../config/db');

async function run() {
    try {
        console.log("--- LOANS ---");
        const loans = await pool.query("SELECT * FROM loans");
        console.table(loans.rows);

        console.log("--- LOAN TRANSACTIONS ---");
        const trans = await pool.query(`
            SELECT lt.*, bse.bank_account_id as bse_bank_id, bse.bank_ref_id
            FROM loan_transactions lt
            LEFT JOIN bank_statement_entries bse ON lt.bank_statement_entry_id = bse.id
        `);
        console.table(trans.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
