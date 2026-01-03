const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function migrate() {
    const files = [
        '001_vendors.sql',
        '002_vendor_addresses.sql',
        '003_product_dependencies.sql',
        '004_products.sql'
    ];

    console.log('Starting Database Migration...');

    try {
        for (const file of files) {
            const filePath = path.join(__dirname, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`Executing: ${file}`);
            await pool.query(sql);
            console.log(`Success: ${file}`);
        }
        console.log('Migration Complete.');
    } catch (err) {
        console.error('Migration Failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
