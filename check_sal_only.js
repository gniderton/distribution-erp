const { pool } = require('./config/db');

async function checkSchema() {
    try {
        const table = 'employee_salaries';
        console.log(`\n--- Schema for ${table} ---`);
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = $1
            ORDER BY ordinal_position
        `, [table]);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSchema();
