const { pool } = require('./config/db');
async function inspect() {
    try {
        const procResult = await pool.query(`
            SELECT pg_get_functiondef(p.oid) 
            FROM pg_proc p 
            JOIN pg_namespace n ON p.pronamespace = n.oid 
            WHERE n.nspname = 'public' AND p.proname = 'create_purchase_invoice'
        `);
        console.log("--- create_purchase_invoice ---");
        console.log(procResult.rows[0]?.pg_get_functiondef);

        const colResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'purchase_invoice_lines'
            ORDER BY ordinal_position
        `);
        console.log("\n--- purchase_invoice_lines columns ---");
        console.table(colResult.rows);
    } catch (err) {
        console.error(err.message);
    } finally {
        process.exit();
    }
}
inspect();
