const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// @route   GET /api/purchase-invoices
// @desc    Get all Purchase Invoices (GRNs)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                pi.id,
                pi.invoice_number, -- Added this!
                pi.vendor_invoice_number,
                pi.vendor_id, -- Needed for Frontend Filtering
                pi.vendor_invoice_date,
                pi.received_date,
                pi.status,
                pi.grand_total,
                COALESCE(pa.paid_amount, 0) as paid_amount,
                COALESCE(dn.dn_amount, 0) as dn_amount,
                (pi.grand_total - COALESCE(pa.paid_amount, 0) - COALESCE(dn.dn_amount, 0)) as balance,
                v.vendor_name as vendor_name,
                ph.po_number -- If linked
            FROM purchase_invoice_headers pi
            JOIN vendors v ON pi.vendor_id = v.id
            LEFT JOIN purchase_order_headers ph ON pi.purchase_order_id = ph.id
            LEFT JOIN (
                SELECT purchase_invoice_id, SUM(amount) as paid_amount 
                FROM payment_allocations 
                GROUP BY purchase_invoice_id
            ) pa ON pi.id = pa.purchase_invoice_id
            LEFT JOIN (
                SELECT purchase_invoice_id, SUM(amount) as dn_amount 
                FROM debit_note_allocations 
                GROUP BY purchase_invoice_id
            ) dn ON pi.id = dn.purchase_invoice_id
            ORDER BY pi.id DESC
        `);

        // Retool expects an array
        // Logic: Balance = Grand Total - Paid Allocations - DN Allocations

        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/purchase-invoices
// @desc    Create new Purchase Invoice (RPC Trigger)
router.post('/', async (req, res) => {
    try {
        const {
            vendor_id,
            purchase_order_id,
            invoice_number,
            invoice_date,
            received_date,
            lines
        } = req.body;

        // Basic Validation
        // Detailed Validation & Debugging
        // We echo back the received 'req.body' so the user can see what the server got.
        if (!req.body) {
            return res.status(400).json({ error: 'Request Body is Empty/Null', received: req.body });
        }
        if (!vendor_id) {
            return res.status(400).json({ error: 'Missing vendor_id', received: req.body });
        }
        if (!lines || !Array.isArray(lines) || lines.length === 0) {
            return res.status(400).json({ error: 'Lines missing or empty array', receivedLines: lines, fullBody: req.body });
        }

        // --- SERVER SIDE CALCULATION & SANITIZATION (Like PO) ---
        // This ensures all numbers are actual numbers, preventing "NaN" or DB errors.

        const enrichedLines = lines.map(line => {
            // 1. Sanitization: Force Numbers
            const accepted_qty = Number(line.accepted_qty) || 0;
            const rate = Number(line.rate) || 0;
            const discount_percent = Number(line.discount_percent) || 0;
            const scheme_amount = Number(line.scheme_amount) || 0;
            const tax_amount_line = Number(line.tax_amount) || 0;

            // Recalculate Row Total for safety?
            // Amount = Taxable + Tax
            // Taxable = (Qty * Rate) - (Qty * Rate * Disc%) - Scheme
            // For now, we trust the Frontend's "Net Amount" logic to match the paper bill exactly, 
            // but we MUST ensure it is a valid Number type.
            const amount = Number(line.amount) || 0;

            return {
                ...line,
                product_id: Number(line.product_id),
                ordered_qty: Number(line.ordered_qty) || 0,
                accepted_qty: accepted_qty,
                rejected_qty: Number(line.rejected_qty) || 0,
                rate: rate,
                discount_percent: discount_percent,
                scheme_amount: scheme_amount,
                tax_amount: tax_amount_line,
                amount: amount,
                mrp: Number(line.mrp) || 0,
                sale_rate: Number(line.sale_rate) || 0,
                // Dates: Handle empty strings
                expiry_date: (line.expiry_date === '' || !line.expiry_date) ? null : line.expiry_date,
                batch_number: line.batch_number || "DEFAULT"
            };
        });

        // 2. Sanitize Header Totals
        const safe_total_net = Number(req.body.total_net) || 0;
        const safe_tax = Number(req.body.tax_amount) || 0;
        const safe_grand = Number(req.body.grand_total) || 0;

        // Fix PO ID: Ensure '0' or 0 or '' becomes null
        const safe_po_id = (purchase_order_id && purchase_order_id !== 0 && purchase_order_id !== '0') ? Number(purchase_order_id) : null;

        // DEBUG
        console.log('--- PROCESSING GRN (Server Sanitized) ---');
        console.log({ vendor_id, safe_po_id, invoice_number, safe_grand });

        // Call the RPC we created
        const result = await pool.query(
            `SELECT create_purchase_invoice(
                $1, $2, $3, $4, $5, $6, $7, $8, $9
            ) as response`,
            [
                vendor_id,
                safe_po_id,
                invoice_number,
                invoice_date,
                received_date,
                safe_total_net,
                safe_tax,
                safe_grand,
                JSON.stringify(enrichedLines),
                req.body.parent_invoice_id || null // Traceability: Link to Old GRN
            ]
        );

        res.json(result.rows[0].response);

    } catch (err) {
        console.error("GRN Create Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/purchase-invoices/:id/reverse - Full Reversal (Correction Mode)
router.post('/:id/reverse', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { reversed_by_id } = req.body;

        if (!reversed_by_id) {
            return res.status(400).json({ error: 'Reversed By ID is required' });
        }

        // 1. Fetch Invoice & Validation
        const invRes = await client.query(`SELECT * FROM purchase_invoice_headers WHERE id = $1`, [id]);
        if (invRes.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
        const invoice = invRes.rows[0];

        if (invoice.status === 'Reversed' || invoice.status === 'Cancelled') {
            return res.status(400).json({ error: 'Invoice is already reversed or cancelled' });
        }

        // 2. Check Stock Integrity (Product Batches)
        // If we sold any stock from this GRN, we CANNOT auto-reverse. User must fix manually.
        const batchCheck = await client.query(`
            SELECT COUNT(*) 
            FROM product_batches 
            WHERE purchase_invoice_id = $1 AND qty_out > 0
        `, [id]);

        if (Number(batchCheck.rows[0].count) > 0) {
            return res.status(400).json({ error: 'Cannot Reverse: Stock from this GRN has already been sold. Please process a Return first.' });
        }

        await client.query('BEGIN');

        // 3. Generate Reversal Debit Note (Full Amount)
        const dnNumber = `DN-REV-${Date.now().toString().slice(-6)}`;
        const reversalReason = `Reversal of GRN: ${invoice.invoice_number} (Correction)`;

        const dnRes = await client.query(`
            INSERT INTO debit_notes 
            (vendor_id, debit_note_number, debit_note_date, amount, reason, linked_invoice_id, status)
            VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, 'Approved')
            RETURNING id
        `, [invoice.vendor_id, dnNumber, invoice.grand_total, reversalReason, id]);

        const dnId = dnRes.rows[0].id;

        // 3b. Add DN Lines (For Audit)
        // Fetch original lines to copy
        const linesRes = await client.query(`SELECT * FROM purchase_invoice_lines WHERE purchase_invoice_id = $1`, [id]);
        for (const line of linesRes.rows) {
            await client.query(`
                INSERT INTO debit_note_lines 
                (debit_note_id, product_id, qty, rate, amount, batch_number, return_type)
                VALUES ($1, $2, $3, $4, $5, $6, 'Reversal')
            `, [dnId, line.product_id, line.accepted_qty, line.rate, line.amount, line.batch_number]);
        }

        // 4. Update GRN Status (With Audit Info)
        await client.query(`
            UPDATE purchase_invoice_headers 
            SET status = 'Reversed', reversed_by_id = $2, reversed_at = NOW()
            WHERE id = $1
        `, [id, reversed_by_id]);

        // 5. Void Batches (Remove Stock)
        await client.query(`
            UPDATE product_batches 
            SET qty_good = 0, is_active = false 
            WHERE purchase_invoice_id = $1
        `, [id]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'GRN Reversed Successfully', new_dn_id: dnId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Reverse GRN Error:", err.message);
        res.status(500).json({ error: 'Server Error reversing GRN' });
    } finally {
        client.release();
    }
});

module.exports = router;
