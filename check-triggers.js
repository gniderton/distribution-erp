const { pool } = require('./config/db');
(async () => {
  try {
    const res = await pool.query(`
      SELECT event_object_table AS table_name, trigger_name, event_manipulation AS event, action_statement
      FROM information_schema.triggers
      WHERE event_object_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Database Triggers:', res.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
