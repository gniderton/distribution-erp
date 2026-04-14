const { pool } = require('./config/db');

async function searchMissingPulses() {
    try {
        const tables = ['employee_advances', 'sales_returns', 'opening_balances'];
        console.log('🕵️ SEARCHING FOR MISSING LIQUID PULSES...');
        
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

searchMissingPulses();
