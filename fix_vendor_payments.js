const { pool } = require('./config/db');

async function fix() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get all vendor payments with Bank Transfer and linked bank statement entries
    const res = await client.query("SELECT amount, bank_statement_entry_id FROM vendor_payments WHERE bank_statement_entry_id IS NOT NULL AND payment_mode IN ('Bank Transfer')");
    
    for (const row of res.rows) {
        await client.query(`
            UPDATE bank_statement_entries 
            SET consumed_amount = COALESCE(consumed_amount, 0) + $1,
                status = CASE 
                    WHEN (debit_amount - (COALESCE(consumed_amount, 0) + $1)) <= 0.01 THEN 'Exhausted'
                    ELSE 'Partially Consumed'
                END
            WHERE id = $2 AND status != 'Exhausted'
        `, [row.amount, row.bank_statement_entry_id]);
    }
    
    await client.query('COMMIT');
    console.log('Fixed vendor payments bank statement consumption.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}
fix();
