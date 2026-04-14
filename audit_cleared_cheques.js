const { pool } = require('./config/db');
async function check() {
    try {
        console.log('🕵️ AUDITING CLEARED CHEQUES...');
        const res = await pool.query(`
            SELECT id, cheque_number, status, bank_account_id, type 
            FROM cheques 
            WHERE status = 'Cleared' 
            LIMIT 20
        `);
        console.table(res.rows);
    } catch(e) {
        console.error(e.message);
    } finally {
        process.exit();
    }
}
check();
