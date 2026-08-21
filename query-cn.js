const { pool } = require('./config/db');
(async () => {
  try {
    const res = await pool.query(`
      SELECT *
      FROM sales_returns 
      WHERE return_number IN ('SR-0587', 'SR-0588');
    `);
    console.log(res.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
