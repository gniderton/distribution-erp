const { pool } = require('./config/db');

async function getFunction() {
    try {
        const query = `
            SELECT pg_get_functiondef(p.oid) 
            FROM pg_proc p 
            JOIN pg_namespace n ON p.pronamespace = n.oid 
            WHERE n.nspname = 'public' 
            AND p.proname = 'create_purchase_invoice'
        `;
        const res = await pool.query(query);
        if (res.rows.length > 0) {
            console.log(res.rows[0].pg_get_functiondef);
        } else {
            console.log("Function not found.");
        }
    } catch (e) {
        console.error(e.message);
    } finally {
        process.exit();
    }
}

getFunction();
