const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/gniderton' });
(async () => {
  try {
    const res = await pool.query("SELECT eway_bill_number FROM sales_invoices WHERE invoice_number = 'INV-26-3267'");
    console.log('DB value:', res.rows[0]);
  } catch(e) { console.error(e) }
  pool.end();
})();
