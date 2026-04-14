const { pool } = require('./config/db');

async function probeOtherIncome() {
    try {
        console.log('🕵️ PROBING OTHER INCOME SCHEMA...');
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'other_income'
        `);
        console.table(res.rows);
        
        console.log('\n🕵️ AUDITING OTHER INCOME DATA...');
        const dataRes = await pool.query(`
            SELECT id, amount, is_active, destination_account_id, bank_statement_entry_id 
            FROM other_income 
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

probeOtherIncome();
