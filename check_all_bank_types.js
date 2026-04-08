const { pool } = require('./config/db');
async function checkTypes() {
    try {
        const c = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cheques' AND column_name = 'bank_account_id'`);
        console.log("cheques.bank_account_id:", c.rows[0].data_type);

        const v = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'vendor_payments' AND column_name = 'bank_account_id'`);
        console.log("vendor_payments.bank_account_id:", v.rows[0].data_type);

        const cp = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'customer_payments' AND column_name = 'deposit_bank'`);
        console.log("customer_payments.deposit_bank:", cp.rows[0].data_type);

    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkTypes();
