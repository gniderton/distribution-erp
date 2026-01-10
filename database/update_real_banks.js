const { pool } = require('../config/db');

async function update() {
    try {
        console.log('Updating Bank Details...');

        // 1. Update Axis Bank (ID 2 usually, relying on name is safer)
        await pool.query(`
            UPDATE bank_accounts 
            SET account_number = $1, bank_name = $2
            WHERE bank_name LIKE 'Axis Bank%'
        `, ['924020006929157', 'Axis Bank (Thiruvannur)']);

        // 2. Update IDFC Bank (ID 3 usually)
        await pool.query(`
            UPDATE bank_accounts 
            SET account_number = $1, bank_name = $2
            WHERE bank_name LIKE 'IDFC First Bank%'
        `, ['60123456706', 'IDFC First Bank (Calicut)']);

        console.log('Banks Updated. Verifying...');
        const res = await pool.query('SELECT * FROM bank_accounts ORDER BY id');
        console.table(res.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
update();
