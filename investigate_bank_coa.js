const { pool } = require('./config/db');
async function checkLinks() {
    try {
        const banks = await pool.query(`SELECT * FROM bank_accounts`);
        console.log("Bank Accounts:");
        console.table(banks.rows);

        const coa = await pool.query(`SELECT * FROM chart_of_accounts WHERE type = 'ASSET' OR name ILIKE '%Bank%'`);
        console.log("Chart of Accounts (Relevant):");
        console.table(coa.rows);

        const exp = await pool.query(`SELECT DISTINCT payment_source_id FROM expenses LIMIT 5`);
        console.log("Sample Expense Payment Source IDs:", exp.rows.map(r => r.payment_source_id));

    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkLinks();
