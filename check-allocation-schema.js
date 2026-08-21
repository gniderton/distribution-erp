const { pool } = require('./config/db');
(async () => {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customer_payment_allocations';
    `);
    console.log('customer_payment_allocations schema:', res.rows);
    
    const returns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sales_returns';
    `);
    console.log('sales_returns schema:', returns.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
