const { pool } = require('./config/db');

(async () => {
  try {
    const res = await pool.query(`
      SELECT routine_definition
      FROM information_schema.routines
      WHERE routine_name = 'create_journal_entry'
    `);
    console.log(res.rows[0].routine_definition);
  } catch(e) {
    console.error(e);
  } finally { process.exit(); }
})();
