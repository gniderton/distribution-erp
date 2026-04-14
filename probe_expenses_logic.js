const { pool } = require('./config/db');

async function probeExpenses() {
    try {
        console.log('🕵️ PROBING MAIN EXPENSES SCHEMA...');
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'expenses'
        `);
        console.table(res.rows);
        
        console.log('\n🕵️ AUDITING EXPENSE SOURCE DATA...');
        const dataRes = await pool.query(`
            SELECT id, grand_total, is_active, payment_source_id, payment_source_row_id 
            FROM expenses 
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

probeExpenses();
