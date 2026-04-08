const { pool } = require('../config/db');
pool.query("SELECT definition FROM pg_views WHERE viewname = 'view_customer_ledger'")
    .then(res => {
        if (res.rows.length > 0) {
            console.log(res.rows[0].definition);
        } else {
            console.log("view_customer_ledger not found");
        }
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
