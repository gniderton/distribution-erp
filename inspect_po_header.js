const { pool } = require('./config/db');

async function test() {
  try {
    const res = await pool.query('SELECT * FROM purchase_order_headers LIMIT 1');
    console.log('--- PO HEADER COLS IN DB ---');
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.log('Error:', err.message);
  }
  process.exit(0);
}

test();
