const { pool } = require('./config/db');
async function checkTable() {
    try {
        const res = await pool.query("SELECT * FROM inventory_batches LIMIT 1");
        console.log(Object.keys(res.rows[0]));
    } catch(e) { console.error(e); }
    finally { pool.end(); }
}
checkTable();
