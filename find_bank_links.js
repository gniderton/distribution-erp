const { pool } = require('./config/db');
async function findBankLinks() {
    try {
        const res = await pool.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE column_name LIKE '%bank_account_id%' 
               OR column_name LIKE '%from_account_id%'
               OR column_name LIKE '%destination_account_id%'
               OR column_name LIKE '%payment_source_id%'
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
findBankLinks();
