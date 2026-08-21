const { pool } = require('./config/db');
(async () => {
  try {
    const res = await pool.query(`SELECT * FROM customer_advances`);
    console.log('Total customer_advances:', res.rows.length);
    console.log('Sample data:', res.rows.slice(0, 3));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
