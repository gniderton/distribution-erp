const { pool } = require('../config/db');
pool.query("SELECT * FROM sales_invoices WHERE invoice_number LIKE 'PEN%'")
    .then(res => {
        console.table(res.rows);
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
