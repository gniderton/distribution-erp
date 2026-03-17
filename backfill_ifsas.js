const { pool } = require('./config/db');

async function updateAllBanks() {
    try {
        console.log('--- Updating all active bank IFSCs ---');
        await pool.query(`
            UPDATE bank_accounts 
            SET ifsc_code = CASE 
                WHEN bank_name ILIKE '%Axis%' THEN 'UTIB0000000' 
                WHEN bank_name ILIKE '%IDFC%' THEN 'IDFB0000000' 
                ELSE 'BKDN0000000' 
            END 
            WHERE is_active = true AND (ifsc_code IS NULL OR ifsc_code = '')
        `);
        console.log('Banks updated successfully.');
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        pool.end();
    }
}

updateAllBanks();
