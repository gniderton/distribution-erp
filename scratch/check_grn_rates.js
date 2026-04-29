const { pool } = require('../config/db');

async function checkGRN() {
    try {
        console.log('--- GRN Lines for 78, 79 ---');
        const lines = await pool.query('SELECT * FROM grn_lines WHERE grn_id IN (78, 79)');
        console.table(lines.rows);

        console.log('--- Inventory Batches for 78, 79 ---');
        const batches = await pool.query('SELECT * FROM inventory_batches WHERE grn_id IN (78, 79)');
        console.table(batches.rows);

        console.log('--- Checking for NULLs in relevant columns ---');
        const nulls = await pool.query(`
            SELECT id, grn_id, product_id, purchase_rate, distributor_rate 
            FROM inventory_batches 
            WHERE grn_id IN (78, 79) AND (purchase_rate IS NULL OR purchase_rate = 0)
        `);
        console.table(nulls.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkGRN();
