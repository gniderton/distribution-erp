const { pool } = require('./config/db');
async function checkBankIds() {
    try {
        const cp = await pool.query(`SELECT DISTINCT bank_id FROM customer_payments WHERE bank_id IS NOT NULL`);
        console.log("Unique Bank IDs in Customer Payments:", cp.rows.map(r => r.bank_id));

        const vp = await pool.query(`SELECT DISTINCT bank_account_id FROM vendor_payments WHERE bank_account_id IS NOT NULL`);
        console.log("Unique Bank IDs in Vendor Payments:", vp.rows.map(r => r.bank_account_id));

        const chk = await pool.query(`SELECT DISTINCT bank_account_id FROM cheques WHERE bank_account_id IS NOT NULL`);
        console.log("Unique Bank IDs in Cheques:", chk.rows.map(r => r.bank_account_id));

    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkBankIds();
