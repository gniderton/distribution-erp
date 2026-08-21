const { pool } = require('./config/db');
(async () => {
  try {
    const res = await pool.query(`
      SELECT pg_get_functiondef(oid) 
      FROM pg_proc 
      WHERE proname = 'old_auto_apply_advances_to_invoice';
    `);
    console.log(res.rows[0].pg_get_functiondef);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
