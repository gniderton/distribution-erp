const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/purchase-orders - List POs (with pagination & filtering)
router.get('/', async (req, res) => {
    // ...
});

router.get('/debug-po/:id', async (req, res) => {
    const { id } = req.params;
    let log = [];
    try {
        log.push(`Checking ID: ${id}`);

        // 1. Connection Test
        log.push("Testing Connection...");
        await pool.query('SELECT 1');
        log.push("Connection OK");

        // 2. Header Query
        log.push("Fetching Header...");
        const headerRes = await pool.query(`SELECT ph.*, v.gst as vendor_gst FROM purchase_order_headers ph LEFT JOIN vendors v ON ph.vendor_id = v.id WHERE ph.id = $1`, [id]);
        log.push(`Header Rows: ${headerRes.rows.length}`);

        // 3. Lines Query
        log.push("Fetching Lines...");
        const linesRes = await pool.query(`SELECT pl.*, p.product_name, p.category_id FROM purchase_order_lines pl LEFT JOIN products p ON pl.product_id = p.id WHERE pl.purchase_order_header_id = $1`, [id]);
        log.push(`Lines Rows: ${linesRes.rows.length}`);

        res.json({ success: true, log, header: headerRes.rows, lines: linesRes.rows });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
            stack: err.stack,
            log
        });
    }
});


// GET /api/purchase-orders/:id - Get Single PO with Lines
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch Header
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
            return res.status(404).json({ error: 'Purchase Order not found' });
        }

        // 2. Fetch Lines (Joined with Products)
        // Fixed: Join on p.id, removed bad columns
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

        // 3. Return Combined Data
        res.json({
            header: headerRes.rows[0],
            lines: linesRes.rows
        });

    } catch (err) {
        console.error('Get PO Error:', err);
        res.status(500).json({ error: 'Database error fetching PO details' });
    }
});

// POST /api/purchase-orders - Create a new Purchase Order
router.post('/', async (req, res) => {
    const {
        vendor_id,
        remarks,
        lines
    } = req.body;

    // Basic Validation
    if (!vendor_id || !lines || lines.length === 0) {
        return res.status(400).json({ error: 'Vendor and at least one line item are required' });
    }

    try {
        // --- SERVER SIDE CALCULATION (Bank-Grade Security) ---
        let calc_total_qty = 0;
        let calc_total_gross = 0;
        let calc_total_scheme = 0;
        let calc_total_disc = 0;
        let calc_total_taxable = 0;
        let calc_gst = 0;
        let calc_grand_total = 0;

        const enrichedLines = lines.map(line => {
            // Inputs (Trusting Qty and Price from user, logic from server)
            const qty = Number(line.ordered_qty) || 0;
            const price = Number(line.price) || 0;
            const mrp = Number(line.mrp) || 0;
            const scheme = Number(line.scheme_amount) || 0;
            const disc_pct = Number(line.discount_percent) || 0;
            const tax_pct = Number(line.tax_percent) || 0; // REQUIRED FIELD for calc

            // Line Calculations
            const gross = qty * price;
            // Discount is usually on (Gross - Scheme) or just Gross. standard is (Gross - Scheme).
            const disc_amt = (gross - scheme) * (disc_pct / 100);
            const taxable = gross - scheme - disc_amt;
            const tax_amt = taxable * (tax_pct / 100);
            const net = taxable + tax_amt;

            // Update Header Totals
            calc_total_qty += qty;
            calc_total_gross += gross;
            calc_total_scheme += scheme;
            calc_total_disc += disc_amt;
            calc_total_taxable += taxable;
            calc_gst += tax_amt;
            calc_grand_total += net;

            return {
                ...line,
                tax_amount: tax_amt.toFixed(2),
                amount: net.toFixed(2)
            };
        });

        // Call the RPC function with CALCULATED totals
        const query = `
            SELECT create_purchase_order(
                $1::INT, 
                $2::NUMERIC, 
                $3::NUMERIC, 
                $4::NUMERIC, 
                $5::NUMERIC, 
                $6::NUMERIC, 
                $7::NUMERIC, 
                $8::TEXT, 
                $9::JSONB
            ) as result;
        `;

        const values = [
            vendor_id,
            calc_grand_total.toFixed(2),  // p_total_net (Final Amount)
            calc_total_qty.toFixed(3),    // p_total_qty
            calc_gst.toFixed(2),          // p_gst
            calc_total_taxable.toFixed(2),// p_total_taxable
            calc_total_scheme.toFixed(2), // p_total_scheme
            calc_total_disc.toFixed(2),   // p_total_disc
            remarks || '',
            JSON.stringify(enrichedLines)
        ];

        const { rows } = await pool.query(query, values);
        const result = rows[0].result;

        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json({ error: 'Failed to create PO' });
        }

    } catch (err) {
        console.error('Create PO Error:', err);
        res.status(500).json({ error: 'Database error creating Purchase Order', details: err.message });
    }
});

module.exports = router;
