const { pool } = require('./config/db');
(async () => {
  try {
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%credit%' OR table_name LIKE '%allocat%' OR table_name LIKE '%settle%');
    `);
    console.log('Relevant Tables:', tables.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
