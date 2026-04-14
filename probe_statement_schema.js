const { pool } = require('./config/db');
async function probe() {
    try {
        console.log('🕵️ PROBING BANK STATEMENT SCHEMA...');
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'bank_statement_entries'
        `);
        console.table(res.rows);
    } catch(e) {
        console.error(e.message);
    } finally {
        process.exit();
    }
}
probe();
