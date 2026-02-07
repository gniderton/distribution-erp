const { pool } = require('./config/db');

async function checkInvoice() {
    try {
        const invRes = await pool.query('SELECT * FROM sales_invoices ORDER BY id DESC LIMIT 1');
        const inv = invRes.rows[0];
        console.log("Invoice Header:", inv);

        const linesRes = await pool.query('SELECT * FROM sales_invoice_lines WHERE invoice_id = $1', [inv.id]);
        console.log("Invoice Lines:", JSON.stringify(linesRes.rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkInvoice();
