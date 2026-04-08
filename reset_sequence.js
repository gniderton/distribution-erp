const { pool } = require('./config/db');

async function reset() {
  try {
    const res = await pool.query("SELECT setval(pg_get_serial_sequence('hsn_codes', 'id'), (SELECT MAX(id) FROM hsn_codes))");
    console.log('Sequence reset to:', res.rows[0].setval);
    process.exit(0);
  } catch (err) {
    console.error('Reset error:', err);
    process.exit(1);
  }
}

reset();
