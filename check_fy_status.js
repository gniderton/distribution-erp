const { pool } = require('./config/db');
async function checkStatus() {
    try {
        const fyStart = '2026-04-01';

        // 1. Check Cheque Statuses
        const chkStatus = await pool.query(`SELECT status, COUNT(*), SUM(amount) FROM cheques WHERE created_at >= $1 GROUP BY status`, [fyStart]);
        console.log("Cheques by Status (FY):");
        console.table(chkStatus.rows);

        // 2. Check Expense Payment Modes
        const expModes = await pool.query(`SELECT DISTINCT payment_source_id FROM expenses`);
        // Wait, payment_source_id is an account? Let's check the accounts.
        const sources = await pool.query(`SELECT id, name, type FROM chart_of_accounts WHERE id IN (SELECT DISTINCT payment_source_id FROM expenses)`);
        console.log("Expense Payment Sources:");
        console.table(sources.rows);

    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkStatus();
