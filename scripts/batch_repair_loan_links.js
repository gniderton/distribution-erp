const { pool } = require('../config/db');

async function repairBatchLoanLinks() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Repair Pair 1 (Loan 7 -> Bank 185)
    await client.query('UPDATE loan_transactions SET bank_statement_entry_id = 185 WHERE id = 7');
    await client.query('UPDATE bank_statement_entries SET consumed_amount = 40000.00, status = \'Exhausted\' WHERE id = 185');
    console.log('✅ Pair 1: Loan Trans 7 linked to Bank Entry 185 (40,000.00)');
    
    // 2. Repair Pair 2 (Loan 8 -> Bank 186)
    await client.query('UPDATE loan_transactions SET bank_statement_entry_id = 186 WHERE id = 8');
    await client.query('UPDATE bank_statement_entries SET consumed_amount = 30000.00, status = \'Exhausted\' WHERE id = 186');
    console.log('✅ Pair 2: Loan Trans 8 linked to Bank Entry 186 (30,000.00)');
    
    await client.query('COMMIT');
    console.log('\n🚀 Batch link repair completed successfully.');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Batch repair failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

repairBatchLoanLinks();
