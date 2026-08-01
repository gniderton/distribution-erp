const { pool } = require('./config/db');
pool.query('SELECT id, invoice_number, grand_total, eway_bill_number FROM sales_invoices WHERE grand_total >= 50000').then(res => {
    console.log(res.rows);
    process.exit(0);
}).catch(console.error);
