const { pool } = require('./config/db');
async function test() {
  try {
    const threshold = 50000;
    const tripId = 135;
    
    // Test the exact query
    const q = `
      SELECT id, invoice_number, grand_total, eway_bill_number 
      FROM sales_invoices 
      WHERE id IN (SELECT invoice_id FROM trip_invoices WHERE trip_id = $1) 
      AND CAST(grand_total AS NUMERIC) >= $2
      AND (eway_bill_number IS NULL OR eway_bill_number = '')
    `;
    const res = await pool.query(q, [tripId, threshold]);
    console.log("Query Results:", res.rows);
    
    // Also check what kdkService does just in case it's filtering out
    // Actually, wait, maybe kdkService.mapInvoiceToKDK is throwing an error for this invoice?
    // Let's test that too
    const kdkService = require('./services/kdkEwayBillService');
    const payloads = [];
    const results = [];
    for (const inv of res.rows) {
        try {
            const payload = await kdkService.mapInvoiceToKDK(inv.id, 'KL11CA3398');
            payloads.push(payload);
            results.push({ id: inv.id, invoice: inv.invoice_number, status: 'Success' });
        } catch (err) {
            console.error(`Error mapping invoice ${inv.invoice_number}:`, err.message);
            results.push({ id: inv.id, invoice: inv.invoice_number, status: 'Error', error: err.message });
        }
    }
    console.log("Payloads generated:", payloads.length);
    console.log("Results:", results);

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
test();
