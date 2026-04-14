const { pool } = require('./config/db');

async function searchFinalShadows() {
    try {
        const tables = ['daily_sales_reports', 'debit_notes', 'incentive_plans', 'employee_daily_achievement'];
        console.log('🕵️ SEARCHING FOR FINAL SHADOW LIQUID PULSES...');
        
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

searchFinalShadows();
