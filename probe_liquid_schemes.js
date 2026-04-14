const { pool } = require('./config/db');

async function probeSchemes() {
    try {
        const tables = ['dse_expenses', 'employee_salaries', 'warehouse_collections', 'asset_transactions'];
        console.log('🕵️ PROBING SCHEMA FOR LIQUID LINKAGE...');
        
        for (const table of tables) {
            console.log(`\n--- ${table.toUpperCase()} ---`);
            const res = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '${table}'
            `);
            console.table(res.rows);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

probeSchemes();
