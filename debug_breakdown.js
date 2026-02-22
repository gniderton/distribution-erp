const { pool } = require('./config/db');
require('dotenv').config();

async function run() {
    try {
        console.log('Inspecting Trip 3, Product 13...');

        // 1. Check raw lines for this trip & product
        const res = await pool.query(`
            SELECT 
                sil.id, sil.product_id, sil.mrp, sil.shipped_qty
            FROM trip_invoices ti
            JOIN sales_invoices si ON ti.invoice_id = si.id
            JOIN sales_invoice_lines sil ON si.id = sil.invoice_id
            WHERE ti.trip_id = 3 AND sil.product_id = 13
        `);

        console.log('Found Lines:', res.rows);

        if (res.rows.length === 0) console.log('No lines found for Trip 3, Product 13.');

    } catch (err) {
        console.error('Debug Failed:', err);
    } finally {
        await pool.end();
    }
}

run();
