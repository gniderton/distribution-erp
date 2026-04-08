const { pool } = require('../config/db');

async function repairLoanLink() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Update Loan Transaction
    await client.query('UPDATE loan_transactions SET bank_statement_entry_id = 192 WHERE id = 9');
    console.log('1. Loan Transaction 9 linked to Bank Entry 192.');
    
    // 2. Update Bank Statement Entry
    await client.query(`
      UPDATE bank_statement_entries 
      SET consumed_amount = 2000.00,
          status = 'Exhausted'
      WHERE id = 192
    `);
    console.log('2. Bank Statement 192 marked as Exhausted.');
    
    await client.query('COMMIT');
    console.log('\n✅ Loan link repaired successfully.');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Repair failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

repairLoanLink();
