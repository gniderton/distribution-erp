const { pool } = require('../config/db');

async function verifyTables() {
    try {
        const tables = ['incentive_plans', 'employee_targets', 'employee_daily_achievement', 'performance_points_history'];
        console.log('--- Table Verification ---');
        
        for (const table of tables) {
            try {
                const res = await pool.query(`SELECT count(*) FROM ${table}`);
                console.log(`✅ ${table}: ${res.rows[0].count} rows found.`);
            } catch (e) {
                console.log(`❌ ${table}: Does not exist or error (${e.message})`);
            }
        }
    } finally {
        await pool.end();
    }
}

verifyTables();
