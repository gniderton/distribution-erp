const { pool } = require('./config/db');

async function check() {
  const p = await pool.query('SELECT id, amount, status, bank_statement_id FROM customer_payments WHERE bank_statement_id = 2233');
  console.log('Customer Payments:', p.rows);

  const bse = await pool.query('SELECT id, amount, consumed_amount, status FROM bank_statement_entries WHERE id = 2233');
  console.log('BSE:', bse.rows);
  
  pool.end();
}
check();
