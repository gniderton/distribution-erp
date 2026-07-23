const { pool } = require('./config/db');

(async () => {
  try {
    console.log('Fetching purchase invoices with grand_total = 0...');
    const result = await pool.query(`
      SELECT h.id
      FROM purchase_invoice_headers h
      WHERE h.grand_total = 0;
    `);
    console.log('Found ' + result.rows.length + ' invoices with grand_total = 0.');
    
    if (result.rows.length > 0) {
       for (let row of result.rows) {
          const invoiceId = row.id;
          console.log('Fixing Invoice ID: ' + invoiceId);
          await pool.query(`
            UPDATE purchase_invoice_headers
            SET 
              total_net = (SELECT COALESCE(SUM(amount - tax_amount), 0) FROM purchase_invoice_lines WHERE purchase_invoice_header_id = $1),
              tax_amount = (SELECT COALESCE(SUM(tax_amount), 0) FROM purchase_invoice_lines WHERE purchase_invoice_header_id = $1),
              grand_total = (SELECT COALESCE(SUM(amount), 0) FROM purchase_invoice_lines WHERE purchase_invoice_header_id = $1)
            WHERE id = $1;
          `, [invoiceId]);
          console.log('Successfully updated invoice ' + invoiceId);
       }
    }
  } catch (err) {
    console.error('Error fixing invoices:', err);
  } finally {
    process.exit();
  }
})();
