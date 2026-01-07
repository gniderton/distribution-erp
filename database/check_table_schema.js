const { pool } = require('../config/db');

async function checkSchema() {
    try {
        console.log('Checking Schema...');

        const tables = ['purchase_invoice_headers', 'purchase_invoice_lines'];

        for (const table of tables) {
            console.log(`\n--- TABLE: ${table} ---`);
            const res = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);

            res.rows.forEach(r => {
                console.log(`   ${r.column_name} (${r.data_type})`);
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkSchema();
