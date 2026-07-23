const { pool } = require('./config/db');

(async () => {
  try {
    const res = await pool.query(`
      SELECT id, reference_id, reference_type, total_amount 
      FROM journal_headers 
      WHERE reference_id = 186 AND reference_type = 'Purchase Invoice'
    `);
    console.log('Journal Headers:', res.rows);
    
    if (res.rows.length > 0) {
      const jhId = res.rows[0].id;
      const lines = await pool.query(`
        SELECT id, account_id, debit, credit 
        FROM journal_lines 
        WHERE journal_header_id = $1
      `, [jhId]);
      console.log('Journal Lines:', lines.rows);
      
      const invoice = await pool.query(`
        SELECT grand_total, tax_amount, total_net FROM purchase_invoice_headers WHERE id = 186
      `);
      console.log('Invoice Totals:', invoice.rows[0]);
    }
  } catch(e) {
    console.error(e);
  } finally { process.exit(); }
})();
