const { pool } = require('../config/db');

async function checkFunctions() {
    try {
        console.log("Checking for 'create_purchase_invoice' functions...");
        const res = await pool.query(`
            SELECT proname, proargtypes::regtype[] as args
            FROM pg_proc
            WHERE proname = 'create_purchase_invoice';
        `);
        console.table(res.rows);
    } catch (err) {
        console.error("Function Check Error:", err.message);
    } finally {
        pool.end();
    }
}
checkFunctions();
