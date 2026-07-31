const { pool } = require('./config/db');
pool.query('SELECT * FROM bank_accounts').then(r => {
    console.log(r.rows);
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
