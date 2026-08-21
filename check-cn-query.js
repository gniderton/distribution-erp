const { pool } = require('./config/db');
(async () => {
  try {
    const query = `
      SELECT 
          cpa.id as allocation_id,
          sr.return_date as credit_note_date,
          sr.return_number as credit_note_no,
          c.customer_name,
          e.full_name as dse_name,
          si.invoice_number as invoice_applied_to,
          si.invoice_date as invoice_date,
          cpa.amount as amount_applied
      FROM customer_payment_allocations cpa
      JOIN sales_returns sr ON cpa.return_id = sr.id
      JOIN sales_invoices si ON cpa.invoice_id = si.id
      JOIN customers c ON sr.customer_id = c.id
      LEFT JOIN employees e ON c.dse_id = e.id
      ORDER BY sr.return_date DESC, cpa.id DESC
      LIMIT 5
    `;
    const res = await pool.query(query, []);
    console.log('Query result:', res.rows.length, 'rows');
    if (res.rows.length > 0) console.log(res.rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
