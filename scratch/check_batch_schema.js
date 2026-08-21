const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/distribution_erp'
});

async function checkSchema() {
  const res = await pool.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('inventory_batches', 'purchase_receipt_lines', 'purchase_receipts', 'sales_invoice_lines')
      AND column_name IN ('batch_id', 'id', 'invoice_id', 'receipt_id', 'quantity', 'shipped_qty', 'received_qty')
  `);
  console.log(res.rows);
  pool.end();
}
checkSchema();
