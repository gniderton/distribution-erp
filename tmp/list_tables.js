const { pool } = require('../config/db');
pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    .then(res => {
        console.table(res.rows);
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
