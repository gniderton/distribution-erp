const { pool } = require('./config/db');
require('dotenv').config();

async function run() {
    try {
        console.log('Connecting to database...');
        // Add login_pin column
        await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS login_pin text;`);
        console.log('Column login_pin added (if not exists).');

        // Set default PIN
        const res = await pool.query(`UPDATE employees SET login_pin = '1234' WHERE employment_status = 'Active' AND login_pin IS NULL;`);
        console.log(`Default PIN set for ${res.rowCount} employees.`);

        console.log('Migration successful.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

run();
