const { pool } = require('./config/db');
(async () => {
  try {
    const res = await pool.query(`
      SELECT pg_get_viewdef('view_customer_advance_balance', true);
    `);
    console.log(res.rows[0].pg_get_viewdef);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
