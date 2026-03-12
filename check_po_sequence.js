const { pool } = require('./config/db');
async function run() {
    try {
        const res = await pool.query("SELECT * FROM document_sequences WHERE document_type ILIKE 'PO' OR document_type ILIKE 'Purchase Order'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
