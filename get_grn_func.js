const { pool } = require('./config/db');

async function getGrnFunction() {
    try {
        const res = await pool.query(`
            SELECT pg_get_functiondef(p.oid) as definition
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = 'create_purchase_invoice';
        `);
        console.log(res.rows[0].definition);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

getGrnFunction();
