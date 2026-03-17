const { pool } = require('./config/db');

async function migrate() {
    try {
        console.log('--- Adding ifsc_code to bank_accounts ---');
        await pool.query(`
            ALTER TABLE bank_accounts 
            ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20)
        `);
        console.log('Column added successfully.');

        console.log('--- Updating Axis Bank IFSC ---');
        await pool.query(`
            UPDATE bank_accounts 
            SET ifsc_code = 'UTIB0000000' 
            WHERE bank_name ILIKE '%Axis Bank%'
        `);
        console.log('Axis Bank updated.');

    } catch (err) {
        console.error('MIGRATION ERROR:', err.message);
    } finally {
        pool.end();
    }
}

migrate();
