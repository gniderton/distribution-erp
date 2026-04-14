const { pool } = require('./config/db');

async function auditLoans() {
    try {
        console.log('🕵️ AUDITING LOAN ENTRIES SLIPPING THROUGH FILTER...');
        const res = await pool.query(`
            SELECT id, transaction_date, amount, transaction_type, payment_mode, reference_no 
            FROM loan_transactions 
            WHERE transaction_date >= '2026-04-01' 
              AND bank_statement_entry_id IS NULL
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

auditLoans();
