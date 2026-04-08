const { pool } = require('./config/db');
async function getDetails() {
    try {
        const headerRes = await pool.query(`SELECT * FROM purchase_invoice_headers WHERE id IN (53, 54)`);
        const lineRes = await pool.query(`SELECT * FROM purchase_invoice_lines WHERE purchase_invoice_header_id IN (53, 54)`);
        
        console.log("Headers:");
        console.log(JSON.stringify(headerRes.rows, null, 2));
        console.log("\nLines:");
        console.log(JSON.stringify(lineRes.rows, null, 2));
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
getDetails();
