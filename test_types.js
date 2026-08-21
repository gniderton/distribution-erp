const { pool } = require('./config/db');

async function test() {
    try {
        const res = await pool.query("SELECT proargnames, proargtypes FROM pg_proc WHERE proname = 'create_journal_entry'"); 
        console.log("create_journal_entry args:", res.rows);
        
        const res2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'debit_notes'");
        console.log("debit_notes columns:", res2.rows);
        
        const res3 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stock_traceability'");
        console.log("stock_traceability columns:", res3.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
test();
