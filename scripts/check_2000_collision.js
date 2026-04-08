const { pool } = require('../config/db');

async function find2000Entries() {
  try {
    const res = await pool.query(`
      SELECT id, particulars, debit_amount, credit_amount, status, transaction_date 
      FROM bank_statement_entries 
      WHERE (debit_amount = 2000 OR credit_amount = 2000) 
      AND transaction_date >= '2026-04-01'
    `);
    console.log('--- Bank Statement Entries for 2000.00 ---');
    console.table(res.rows);
    
    const lt = await pool.query('SELECT id, loan_id, amount, bank_statement_entry_id FROM loan_transactions WHERE amount = 2000');
    console.log('\n--- Loan Transactions for 2000.00 ---');
    console.table(lt.rows);

    const chq = await pool.query('SELECT id, cheque_number, amount, bank_statement_entry_id, status FROM cheques WHERE amount = 2000');
    console.log('\n--- Cheques for 2000.00 ---');
    console.table(chq.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

find2000Entries();
