const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// @route   GET /api/purchase-invoices
// @desc    Get all Purchase Invoices (with optional filters)
router.get('/', async (req, res) => {
    try {
        const { vendor_id, pending_only } = req.query;
        let queryParams = [];
        let whereConditions = [];

        if (vendor_id) {
            queryParams.push(vendor_id);
            whereConditions.push(`pi.vendor_id = $${queryParams.length}`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const baseQuery = `
            WITH invoice_summary AS (
                SELECT 
                    pi.id,
                    pi.invoice_number,
                    pi.vendor_invoice_number,
                    pi.vendor_id,
                    pi.purchase_order_id,
                    pi.vendor_invoice_date,
                    pi.received_date,
                    pi.status,
                    pi.grand_total,
                    v.vendor_name,
                    ph.po_number,
                    COALESCE(pa.paid_amount, 0) as paid_amount,
                    COALESCE(dn.dn_amount, 0) as dn_amount,
                    CASE 
                        WHEN pi.status IN ('Reversed', 'Cancelled') THEN 0
                        ELSE (pi.grand_total - COALESCE(pa.paid_amount, 0) - COALESCE(dn.dn_amount, 0))
                    END as balance
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
                ${whereClause}
            )
            SELECT *,
                (
                    SELECT json_agg(json_build_object(
                        '_product_id', pl.product_id,
                        'Item Name', p.product_name,
                        'Ean code', p.ean_code,
                        'MRP', COALESCE((SELECT mrp FROM inventory_batches ib WHERE ib.purchase_invoice_line_id = pl.id LIMIT 1), p.mrp),
                        'Qty', pl.accepted_qty,
                        'Price', pl.rate,
                        'Gross', (pl.accepted_qty * pl.rate),
                        'Sch', pl.scheme_amount,
                        'Disc %', pl.discount_percent,
                        'Taxable', (pl.amount - pl.tax_amount),
                        'GST $', pl.tax_amount,
                        'Net $', pl.amount,
                        'Batch No', (SELECT batch_code FROM inventory_batches ib WHERE ib.purchase_invoice_line_id = pl.id LIMIT 1),
                        'Expiry', (SELECT expiry_date FROM inventory_batches ib WHERE ib.purchase_invoice_line_id = pl.id LIMIT 1),
                        'Tax %', COALESCE(t.tax_percentage, ROUND((pl.tax_amount / NULLIF(pl.amount - pl.tax_amount, 0)) * 100, 2), 0),
                        'Tax Name', CASE 
                            WHEN t.tax_name IS NOT NULL THEN t.tax_name 
                            WHEN pl.tax_amount > 0 THEN 'GST ' || ROUND((pl.tax_amount / NULLIF(pl.amount - pl.tax_amount, 0)) * 100, 0) || '%' 
                            ELSE 'No Tax' 
                        END
                    ))
                    FROM purchase_invoice_lines pl
                    JOIN products p ON pl.product_id = p.id
                    LEFT JOIN taxes t ON p.tax_id = t.id
                    WHERE pl.purchase_invoice_header_id = invoice_summary.id
                ) as lines_json
            FROM invoice_summary
            ${pending_only === 'true' ? 'WHERE balance > 0' : ''}
            ORDER BY id DESC
        `;

        const result = await pool.query(baseQuery, queryParams);
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
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
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

        // 2. Check Stock Integrity (Inventory Batches)
        // If we sold any stock from this GRN, we CANNOT auto-reverse. User must fix manually.
        const batchCheck = await client.query(`
            SELECT COUNT(*) 
            FROM inventory_batches 
            WHERE purchase_invoice_line_id IN (
                SELECT id FROM purchase_invoice_lines WHERE purchase_invoice_header_id = $1
            ) 
            AND (quantity_initial - quantity_remaining) > 0 -- If any stock has been moved
            AND is_active = true
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
        // Fetch original lines to copy, joining with Batches to get the Batch Number
        const linesRes = await client.query(`
            SELECT pil.*, ib.batch_code as batch_number 
            FROM purchase_invoice_lines pil
            LEFT JOIN inventory_batches ib ON ib.purchase_invoice_line_id = pil.id
            WHERE pil.purchase_invoice_header_id = $1
        `, [id]);

        for (const line of linesRes.rows) {
            await client.query(`
                INSERT INTO debit_note_lines 
                (debit_note_id, product_id, qty, rate, amount, batch_number, return_type)
                VALUES ($1, $2, $3, $4, $5, $6, 'Reversal')
            `, [dnId, line.product_id, line.accepted_qty, line.rate, line.amount, line.batch_number || 'BATCH-MISSING']);
        }

        // 4. Update GRN Status (With Audit Info)
        await client.query(`
            UPDATE purchase_invoice_headers 
            SET status = 'Reversed', reversed_by_id = $2, reversed_at = NOW()
            WHERE id = $1
        `, [id, reversed_by_id]);

        // 5. Void Batches (Remove Stock)
        // Fix: Use correct columns (quantity_remaining, purchase_invoice_line_id)
        await client.query(`
            UPDATE inventory_batches 
            SET quantity_remaining = 0, is_active = false 
            WHERE purchase_invoice_line_id IN (
                SELECT id FROM purchase_invoice_lines WHERE purchase_invoice_header_id = $1
            )
        `, [id]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'GRN Reversed Successfully', new_dn_id: dnId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Reverse GRN Error:", err.message);
        console.error("DEBUG Body Received:", req.body); // Log what we got
        // Return actual error message to Frontend for debugging
        res.status(500).json({ error: `Server Error: ${err.message}` });
    } finally {
        client.release();
    }
});

module.exports = router;
