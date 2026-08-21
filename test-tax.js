const { pool } = require('./config/db');
(async () => {
  try {
    const res2 = await pool.query(`
      SELECT id, product_id, rate, ordered_qty, amount, tax_percent, tax_amount 
      FROM sales_order_lines 
      LIMIT 5
    `);
    console.log('Any SO Lines:', res2.rows);

    const res3 = await pool.query(`
      SELECT id, product_name, tax_rate, mrp
      FROM products 
      LIMIT 5
    `);
    console.log('Products:', res3.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
