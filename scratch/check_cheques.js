const { pool } = require('../config/db');

async function checkCheques() {
    try {
        console.log("--- CHEQUE TABLE SUMMARY ---");
        const res = await pool.query("SELECT status, type, SUM(amount) as total_amount, COUNT(*) as count FROM cheques GROUP BY status, type");
        console.table(res.rows);

        console.log("\n--- RECENT PENDING CHEQUES ---");
        const pending = await pool.query("SELECT cheque_number, cheque_date, bank_name, amount, party_type FROM cheques WHERE status = 'PENDING' ORDER BY cheque_date DESC LIMIT 5");
        console.table(pending.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkCheques();
