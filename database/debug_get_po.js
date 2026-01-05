const { pool } = require('../config/db');

async function debugGetPO(id) {
    try {
        console.log(`fetching PO ${id}...`);

        // 1. Fetch Header (FIXED QUERY)
        // Removed v.address, changed v.gst_number to v.gst
        const headerRes = await pool.query(`
            SELECT 
                ph.*, 
                v.vendor_name,
                v.gst as vendor_gst
            FROM purchase_order_headers ph
            LEFT JOIN vendors v ON ph.vendor_id = v.id
            WHERE ph.id = $1
        `, [id]);

        if (headerRes.rows.length === 0) {
            console.log('PO Header Not Found');
            return;
        }
        console.log('✅ Header Found:', headerRes.rows[0].po_number);

        // 2. Fetch Lines (FIXED QUERY)
        // Changed p.product_id to p.id, removed department_id
        console.log('Fetching Lines...');
        const linesRes = await pool.query(`
            SELECT 
                pl.*,
                p.product_name,
                p.ean_code,
                p.category_id
            FROM purchase_order_lines pl
            LEFT JOIN products p ON pl.product_id = p.id
            WHERE pl.purchase_order_header_id = $1
            ORDER BY pl.id ASC
        `, [id]);

        console.log('✅ Lines Found:', linesRes.rows.length);
        if (linesRes.rows.length > 0) {
            console.log('Sample Line Product:', linesRes.rows[0].product_name);
        }

    } catch (err) {
        console.error('❌ SQL ERROR ❌');
        console.error(err.message);
    } finally {
        process.exit();
    }
}

// Test with ID 29 (from user screenshot) or latest
pool.query('SELECT id FROM purchase_order_headers ORDER BY id DESC LIMIT 1')
    .then(res => debugGetPO(res.rows[0]?.id || 29));
