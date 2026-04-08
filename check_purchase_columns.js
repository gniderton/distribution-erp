const { pool } = require('./config/db');
async function checkTable() {
    try {
        const res = await pool.query("SELECT * FROM purchase_invoice_lines LIMIT 1");
        console.log("Lines Columns:", Object.keys(res.rows[0]));
        const res2 = await pool.query("SELECT * FROM purchase_invoice_headers LIMIT 1");
        console.log("Header Columns:", Object.keys(res2.rows[0]));
    } catch(e) { console.error(e); }
    finally { pool.end(); }
}
checkTable();
