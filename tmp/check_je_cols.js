const { pool } = require('./config/db');
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'journal_entries'")
    .then(r => { console.table(r.rows); process.exit(); })
    .catch(e => { console.error(e.message); process.exit(1); });
