const { pool } = require('../config/db');
pool.query("SELECT definition FROM pg_views WHERE viewname = 'view_vendor_ledger'")
    .then(res => {
        console.log(res.rows[0].definition);
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
