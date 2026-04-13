const { pool } = require('./config/db');
async function scan() {
    try {
        console.log('🕵️ SCANNING IDFC FOR UNCONSUMED DEBITS...');
        const res = await pool.query(`
            SELECT 
                description, 
                debit_amount, 
                consumed_amount, 
                (debit_amount - consumed_amount) as gap 
            FROM bank_statement_entries 
            WHERE bank_name ILIKE '%IDFC%' 
            AND debit_amount > 0 
            AND status != 'Exhausted'
        `);
        console.table(res.rows);
        
        const totalGap = await pool.query(`
            SELECT SUM(debit_amount - consumed_amount) as total_debit_gap 
            FROM bank_statement_entries 
            WHERE bank_name ILIKE '%IDFC%' 
            AND status != 'Exhausted'
        `);
        console.log('Total Unconsumed IDFC Debits: ' + totalGap.rows[0].total_debit_gap);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
scan();
