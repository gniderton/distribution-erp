const { pool } = require('./config/db');
require('dotenv').config();

async function run() {
    try {
        console.log('Fetching test credentials...');
        const res = await pool.query(`
            SELECT full_name, designation, contact_primary, login_pin
            FROM employees
            WHERE employment_status = 'Active' 
            AND login_pin IS NOT NULL
            AND designation IN ('Driver', 'DSE', 'Dispatcher')
            LIMIT 5
        `);

        console.table(res.rows);
    } catch (err) {
        console.error('Query failed:', err);
    } finally {
        await pool.end();
    }
}

run();
