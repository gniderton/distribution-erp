const { pool } = require('./config/db');

async function audit() {
    try {
        const r = await pool.query(`
            SELECT 
                tgname AS trigger_name,
                proname AS function_name,
                tgenabled AS enabled
            FROM pg_trigger
            JOIN pg_class ON pg_class.oid = tgrelid
            JOIN pg_proc ON pg_proc.oid = tgfoid
            WHERE relname = 'bank_statement_entries'
        `);
        console.log("--- DATABASE TRIGGERS ---");
        console.table(r.rows);
        
        const cols = await pool.query(`
            SELECT column_name, column_default, is_generated, generation_expression
            FROM information_schema.columns
            WHERE table_name = 'bank_statement_entries'
            AND column_name IN ('debit_amount', 'credit_amount', 'amount')
        `);
        console.log("--- COLUMN DEFINITIONS ---");
        console.table(cols.rows);
        
    } catch (e) {
        console.error("Audit Failed:", e.message);
    } finally {
        pool.end();
    }
}

audit();
