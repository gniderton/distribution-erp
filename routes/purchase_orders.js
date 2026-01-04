const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

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
