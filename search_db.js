const { pool } = require('./config/db');
pool.query(`SELECT proname FROM pg_proc WHERE prosrc ILIKE '%customer_advances%'`).then(res => {
    console.log(res.rows.map(r=>r.proname)); 
    process.exit(0);
});
