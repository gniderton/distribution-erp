const { pool } = require('./config/db');

async function check() {
  try {
    const res = await pool.query('SELECT * FROM bank_accounts');
    console.log('--- BANK ACCOUNTS IN DB ---');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.log('Error:', err.message);
  }
  process.exit(0);
}

check();
