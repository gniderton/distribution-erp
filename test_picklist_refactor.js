const { pool } = require('./config/db');
require('dotenv').config();

async function run() {
    try {
        console.log('Testing APIs...');

        // 1. Get a Trip ID
        const tripRes = await pool.query('SELECT id FROM delivery_trips LIMIT 1');
        const tripId = tripRes.rows[0].id;
        console.log('Using Trip ID:', tripId);

        // 2. Call GET /picklist Query (Simulated)
        const picklistRes = await pool.query(`
            SELECT 
                p.id as product_id,
                p.product_name, p.product_code,
                sil.mrp,
                SUM(sil.shipped_qty) as total_qty
            FROM trip_invoices ti
            JOIN sales_invoices si ON ti.invoice_id = si.id
            JOIN sales_invoice_lines sil ON si.id = sil.invoice_id
            JOIN products p ON sil.product_id = p.id
            WHERE ti.trip_id = $1
            GROUP BY p.id, p.product_name, p.product_code, sil.mrp
            LIMIT 1
        `, [tripId]);

        if (picklistRes.rows.length === 0) {
            console.log('No items in picklist.');
            return;
        }

        const item = picklistRes.rows[0];
        console.log('Picklist Item:', item);

        // 3. Call GET /product-breakdown using product_id (Simulated)
        const breakdownRes = await pool.query(`
            SELECT 
                c.customer_name, 
                si.invoice_number,
                sil.shipped_qty as qty,
                sil.mrp
            FROM trip_invoices ti
            JOIN sales_invoices si ON ti.invoice_id = si.id
            JOIN customers c ON si.customer_id = c.id
            JOIN sales_invoice_lines sil ON si.id = sil.invoice_id
            WHERE ti.trip_id = $1 
              AND sil.product_id = $2
              AND sil.mrp = $3
            ORDER BY c.customer_name
        `, [tripId, item.product_id, item.mrp]);

        console.log('Breakdown Results:', breakdownRes.rows);

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        await pool.end();
    }
}

run();
