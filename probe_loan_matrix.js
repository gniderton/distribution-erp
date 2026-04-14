const { pool } = require('./config/db');

async function probeLoanLogic() {
    try {
        console.log('🕵️ PROBING LOANS SCHEMA...');
        const resLoans = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'loans'
        `);
        console.table(resLoans.rows);

        console.log('\n🕵️ PROBING LOAN_TRANSACTIONS SCHEMA...');
        const resTrans = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'loan_transactions'
        `);
        console.table(resTrans.rows);
        
        console.log('\n🕵️ AUDITING LOAN DATA MATRIX...');
        const matrixRes = await pool.query(`
            SELECT l.loan_type, lt.transaction_type, lt.amount, lt.payment_mode, lt.remarks 
            FROM loan_transactions lt
            JOIN loans l ON lt.loan_id = l.id
            WHERE lt.payment_mode != 'MIGRATION'
            LIMIT 10
        `);
        console.table(matrixRes.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

probeLoanLogic();
