const { pool } = require('./config/db');

async function activateVendors() {
    try {
        const result = await pool.query('UPDATE vendors SET is_active = true');
        console.log(`Successfully activated ${result.rowCount} vendors.`);
        
        // Verify
        const active = await pool.query('SELECT COUNT(*) FROM vendors WHERE is_active = true');
        console.log('Current Active Vendors count:', active.rows[0].count);
        
        process.exit(0);
    } catch (err) {
        console.error('Error activating vendors:', err);
        process.exit(1);
    }
}

activateVendors();
