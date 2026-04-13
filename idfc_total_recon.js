const { pool } = require('./config/db');
async function scan() {
    try {
        console.log('🕵️ SCANNING IDFC BANK STATEMENTS FOR THE GAP...');
        
        const res = await pool.query(`
            SELECT 
                SUM(credit_amount - consumed_amount) as unconsumed_in,
                SUM(debit_amount - consumed_amount) as unconsumed_out,
                SUM((credit_amount - consumed_amount) - (debit_amount - consumed_amount)) as net_delta
            FROM bank_statement_entries 
            WHERE bank_name ILIKE '%IDFC%' 
            AND status != 'Exhausted'
        `);
        console.table(res.rows);

        const targetGap = 87741 - 6500;
        console.log(`\nYour Current Phoenix: ₹87,741`);
        console.log(`Your Target Balance: ₹6,500`);
        console.log(`Required Net Deduction: ₹${targetGap}`);

    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
scan();
