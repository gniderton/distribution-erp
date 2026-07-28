const { pool } = require('./config/db');

async function fix() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE customer_payments SET bank_statement_entry_id = 2266 WHERE id = 5096');
    await client.query("UPDATE bank_statement_entries SET consumed_amount = 4710, status = 'Exhausted' WHERE id = 2266");
    await client.query('COMMIT');
    console.log('Fixed DB entries for 2266 safely.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}
fix();
