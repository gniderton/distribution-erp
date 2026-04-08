const { pool } = require('./config/db');

async function resetAll() {
  const tables = ['brands', 'categories', 'taxes', 'hsn_codes', 'vendors', 'products'];
  for (const table of tables) {
    try {
      const res = await pool.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), (SELECT MAX(id) FROM ${table}))`);
      console.log(`Reset sequence for ${table} to: ${res.rows[0].setval}`);
    } catch (err) {
      console.error(`Error resetting ${table}:`, err.message);
    }
  }
  process.exit(0);
}

resetAll();
