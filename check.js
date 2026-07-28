const { pool } = require('./config/db');
async function check() { 
  const bse = await pool.query('SELECT * FROM bank_statement_entries WHERE id = 2266'); 
  console.log('BSE 2266:', bse.rows); 
  const cpLinked = await pool.query('SELECT * FROM customer_payments WHERE bank_statement_entry_id = 2266'); 
  console.log('Linked CP:', cpLinked.rows); 
  const cpUnlinked = await pool.query("SELECT * FROM customer_payments WHERE bank_statement_entry_id IS NULL AND payment_mode = 'NEFT' AND verification_status = 'Verified' ORDER BY verified_at DESC LIMIT 10"); 
  console.log('Unlinked Verified NEFT:', cpUnlinked.rows); 
  pool.end(); 
} 
check();
