const { pool } = require('./config/db');

async function inspectTables() {
    try {
        const tables = ['employees', 'bank_accounts', 'customers'];
        for (const table of tables) {
            const result = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '${table}'
            `);
            console.log(`Columns in ${table}:`, result.rows.map(r => r.column_name));
        }
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        pool.end();
    }
}

inspectTables();
