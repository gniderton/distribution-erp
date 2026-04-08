const { pool } = require('./config/db');

async function check() {
    try {
        const total = await pool.query('SELECT COUNT(*) FROM vendors');
        const active = await pool.query('SELECT COUNT(*) FROM vendors WHERE is_active = true');
        const sample = await pool.query('SELECT id, vendor_name, is_active FROM vendors LIMIT 5');
        
        console.log('Total Vendors:', total.rows[0].count);
        console.log('Active Vendors:', active.rows[0].count);
        console.log('Sample Vendors:', sample.rows);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
