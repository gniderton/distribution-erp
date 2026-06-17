const { pool } = require('../config/db');

async function run() {
    try {
        const res = await pool.query(`
            SELECT pg_get_functiondef(oid) as def
            FROM pg_proc 
            WHERE proname = 'create_purchase_invoice'
        `);
        if (res.rows.length === 0) {
            console.log("Function not found");
        } else {
            console.log(res.rows[0].def);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
