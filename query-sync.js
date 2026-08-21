const { pool } = require('./config/db');
(async () => {
  try {
    const res = await pool.query(`
      SELECT *
      FROM sync_logs 
      WHERE id = 349;
    `);
    console.log(res.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
