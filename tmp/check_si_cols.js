const { pool } = require('../config/db');
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'sales_invoices'")
    .then(res => {
        console.table(res.rows);
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
