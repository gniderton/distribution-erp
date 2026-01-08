const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function applySeed() {
    try {
        console.log('--- Seeding DN Sequence ---');

        const sqlPath = path.join(__dirname, '014_seed_dn_sequence.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);

        console.log('✅ Sequence Seeded!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

applySeed();
