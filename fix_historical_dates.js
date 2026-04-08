const { pool } = require('./config/db');

async function fix() {
  try {
    const res = await pool.query(`
      UPDATE purchase_invoice_headers 
      SET received_date = vendor_invoice_date 
      WHERE (invoice_number LIKE 'OLD-BILL-%' OR id BETWEEN 2 AND 100)
      AND received_date = CURRENT_DATE
    `);
    console.log(`Successfully fixed ${res.rowCount} records.`);
    process.exit(0);
  } catch (err) {
    console.error('Error fixing dates:', err);
    process.exit(1);
  }
}

fix();
