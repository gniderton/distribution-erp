const { pool } = require('./config/db');
async function checkDataType() {
    try {
        const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'customer_payments' AND column_name = 'deposit_bank'`);
        process.stdout.write(JSON.stringify(res.rows));
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
checkDataType();
