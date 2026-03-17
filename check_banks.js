const { pool } = require('./config/db');

async function checkBanks() {
    try {
        const result = await pool.query(`
            SELECT * FROM bank_accounts 
            WHERE is_active = true AND account_number != 'CASH'
            LIMIT 1
        `);
        console.log('Bank Result:', result.rows[0]);
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        pool.end();
    }
}

checkBanks();
