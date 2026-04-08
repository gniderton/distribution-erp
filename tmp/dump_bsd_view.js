const { pool } = require('../config/db');
const fs = require('fs');
pool.query("SELECT pg_get_viewdef('view_bank_statement_details')")
    .then(r => {
        fs.writeFileSync('tmp/view_bsd.sql', r.rows[0].pg_get_viewdef);
        console.log('Done - check tmp/view_bsd.sql');
        process.exit();
    })
    .catch(e => { console.error(e.message); process.exit(1); });
