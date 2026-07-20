const { pool } = require('./config/db');

async function test() {
  try {
    const res = await pool.query('SELECT * FROM company_settings');
    console.log('--- COMPANY SETTINGS ---');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.log('Error:', err.message);
  }
  process.exit(0);
}

test();
