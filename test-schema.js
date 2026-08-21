const { pool } = require('./config/db');
(async () => {
  try {
    const res = await pool.query(`
      SELECT * FROM taxes LIMIT 5;
    `);
    console.log(res.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
