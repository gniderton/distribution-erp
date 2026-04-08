const { pool } = require('./config/db');
require('dotenv').config();

async function run() {
    try {
        const res = await pool.query('SELECT employee_code, full_name, login_pin, employment_status FROM employees');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error fetching employees:', err);
    } finally {
        await pool.end();
    }
}

run();
