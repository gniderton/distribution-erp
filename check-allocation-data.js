const { pool } = require('./config/db');
(async () => {
  try {
    const res = await pool.query(`
      SELECT cpa.id, cpa.payment_id, cpa.invoice_id, cpa.return_id, cpa.amount, 
             sr.return_number, si.invoice_number, c.customer_name
      FROM customer_payment_allocations cpa
      JOIN sales_returns sr ON cpa.return_id = sr.id
      JOIN sales_invoices si ON cpa.invoice_id = si.id
      JOIN customers c ON sr.customer_id = c.id
      LIMIT 5;
    `);
    console.log('Sample Allocations:', res.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
