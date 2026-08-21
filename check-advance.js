const { pool } = require('./config/db');
(async () => {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'view_customer_advance_balance';
    `);
    console.log('view_customer_advance_balance:', res.rows);
    const res2 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customer_advances';
    `);
    console.log('customer_advances:', res2.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
