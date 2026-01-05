const { pool } = require('../config/db');

async function debugGetPO(id) {
    try {
        console.log(`fetching PO ${id}...`);

        // 1. Fetch Header
        const headerRes = await pool.query(`
            SELECT 
                ph.*, 
                v.vendor_name,
                v.address as vendor_address,
                v.gst_number as vendor_gst
            FROM purchase_order_headers ph
            LEFT JOIN vendors v ON ph.vendor_id = v.id
            WHERE ph.id = $1
        `, [id]);

        if (headerRes.rows.length === 0) {
            console.log('PO Header Not Found (or ID is wrong)');
            // Check what IDs exist
            const ids = await pool.query('SELECT id FROM purchase_order_headers LIMIT 5');
            console.log('Available IDs:', ids.rows.map(r => r.id));
            return;
        }
        console.log('Header Found:', headerRes.rows[0].po_number);

        // 2. Fetch Lines (The problematic query)
        console.log('Fetching Lines...');
        const linesRes = await pool.query(`
            SELECT 
                pl.*,
                p.product_name,
                p.ean_code,
                p.department_id,  -- I suspect this is the culprit
                p.category_id
            FROM purchase_order_lines pl
            LEFT JOIN products p ON pl.product_id = p.product_id  -- Also check join column
            WHERE pl.purchase_order_id = $1
            ORDER BY pl.id ASC
        `, [id]);

        console.log('Lines Found:', linesRes.rows.length);

    } catch (err) {
        console.error('--- SQL ERROR ---');
        console.error(err.message);
        console.error('-----------------');
    } finally {
        process.exit();
    }
}

// Check the most recent PO
pool.query('SELECT id FROM purchase_order_headers ORDER BY id DESC LIMIT 1')
    .then(res => debugGetPO(res.rows[0]?.id || 1));
