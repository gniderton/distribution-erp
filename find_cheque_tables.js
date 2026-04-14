const { pool } = require('./config/db');

async function findTable() {
    try {
        console.log('🕵️ SEARCHING FOR CHEQUE CLEARANCE TABLES...');
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND (table_name ILIKE '%cheque%' OR table_name ILIKE '%clear%')
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

findTable();
