const { pool } = require('./config/db');

async function checkSRLines() {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sales_return_lines'
        `);
        console.log('--- sales_return_lines ---');
        console.log(res.rows.map(r => r.column_name).join(', '));
    } catch (err) {
        console.error('Error checking schemas:', err);
    } finally {
        await pool.end();
    }
}

checkSRLines();
