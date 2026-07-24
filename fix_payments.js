const { pool } = require('./config/db');

async function fix() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE customer_payments SET bank_statement_entry_id = 2233 WHERE id IN (4905, 4906)');
    await client.query("UPDATE bank_statement_entries SET consumed_amount = 2035, status = 'Exhausted' WHERE id = 2233");
    await client.query("UPDATE bank_statement_entries SET consumed_amount = 0, status = 'Available' WHERE id = 2223");
    await client.query('COMMIT');
    console.log('Fixed DB entries safely.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}
fix();
