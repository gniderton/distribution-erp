const { pool } = require('./config/db');

async function check() {
    try {
        const res = await pool.query('SELECT id, asset_name FROM assets');
        console.log('Assets in table:', res.rows);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

check();
