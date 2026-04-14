const { pool } = require('./config/db');

async function probeTransfers() {
    try {
        console.log('🕵️ PROBING INTERNAL TRANSFERS SCHEMA...');
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'internal_transfers'
        `);
        console.table(res.rows);
        
        console.log('\n🕵️ AUDITING TRANSFER SOURCE DATA...');
        const dataRes = await pool.query(`
            SELECT id, amount, is_active, from_account_id, to_account_id, from_bank_statement_entry_id, to_bank_statement_entry_id 
            FROM internal_transfers 
            WHERE is_active = true 
            LIMIT 5
        `);
        console.table(dataRes.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

probeTransfers();
