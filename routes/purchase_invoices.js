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
                    v.vendor_code,
                    v.contact_no as vendor_contact,
                    v.email as vendor_email,
                    v.gst as vendor_gst,
                    COALESCE(va.address_line, v.address_line1) as vendor_address_1,
                    COALESCE(va.area, v.address_line2) as vendor_address_2,
                    COALESCE(va.district, v.district) as vendor_district,
                    COALESCE(va.city, v.state) as vendor_city,
                    va.state_code as vendor_state,
                    va.pin_code as vendor_pin,
                    v.pan as vendor_pan,
                    ph.po_number,
                    (SELECT SUM(accepted_qty) FROM purchase_invoice_lines WHERE purchase_invoice_header_id = pi.id) as total_qty,
                    (SELECT SUM(amount - tax_amount) FROM purchase_invoice_lines WHERE purchase_invoice_header_id = pi.id) as total_taxable,
                    (SELECT SUM(tax_amount) FROM purchase_invoice_lines WHERE purchase_invoice_header_id = pi.id) as total_tax_amount,
                    COALESCE(pa.paid_amount, 0) as paid_amount,
                    COALESCE(dn.dn_amount, 0) as dn_amount,
                    CASE 
                        WHEN pi.status IN ('Reversed', 'Cancelled') THEN 0
                        ELSE (pi.grand_total - COALESCE(pa.paid_amount, 0) - COALESCE(dn.dn_amount, 0))
                    END as balance
                FROM purchase_invoice_headers pi
                JOIN vendors v ON pi.vendor_id = v.id
                LEFT JOIN vendor_addresses va ON v.id = va.vendor_id AND va.is_default = true
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
                        'Disc Amt', pl.discount_amount,
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

// @route   GET /api/purchase-invoices/aging
// @desc    Get Purchase Invoices with aging report (bill amt, paid amt, debit note amt, balance, days since received/bill date)
router.get('/aging', async (req, res) => {
    try {
        const { vendor_id } = req.query;
        let queryParams = [];
        let whereConditions = [];

        if (vendor_id) {
            queryParams.push(vendor_id);
            whereConditions.push(`pi.vendor_id = $${queryParams.length}`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
            SELECT 
                pi.id,
                pi.invoice_number,
                pi.vendor_invoice_number,
                pi.vendor_invoice_date as bill_date,
                pi.received_date,
                pi.vendor_id,
                v.vendor_name,
                pi.status,
                pi.grand_total as bill_amount,
                COALESCE(pa.paid_amount, 0) as paid_amount,
                COALESCE(dn.dn_amount, 0) as debit_note_amount,
                CASE 
                    WHEN pi.status IN ('Reversed', 'Cancelled') THEN 0.00
                    ELSE ROUND(pi.grand_total - COALESCE(pa.paid_amount, 0) - COALESCE(dn.dn_amount, 0), 2)
                END as balance_amount,
                CASE 
                    WHEN pi.status NOT IN ('Reversed', 'Cancelled') 
                         AND (pi.grand_total - COALESCE(pa.paid_amount, 0) - COALESCE(dn.dn_amount, 0)) > 0 
                    THEN COALESCE((CURRENT_DATE - pi.received_date)::TEXT, 'N/A')
                    ELSE 'Paid'
                END as days_since_received,
                CASE 
                    WHEN pi.status NOT IN ('Reversed', 'Cancelled') 
                         AND (pi.grand_total - COALESCE(pa.paid_amount, 0) - COALESCE(dn.dn_amount, 0)) > 0 
                    THEN COALESCE((CURRENT_DATE - pi.vendor_invoice_date)::TEXT, 'N/A')
                    ELSE 'Paid'
                END as days_since_bill_date
            FROM purchase_invoice_headers pi
            JOIN vendors v ON pi.vendor_id = v.id
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
            ORDER BY pi.vendor_invoice_date DESC, pi.id DESC
        `;

        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error("Aging API Error:", err.message);
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

        // 1.5 Fetch Product Master Rates for Fallback
        const productIds = [...new Set(lines.map(l => Number(l.product_id)))];
        const productRatesRes = await pool.query(
            'SELECT id, distributor_rate, wholesale_rate, dealer_rate, retail_rate FROM products WHERE id = ANY($1)',
            [productIds]
        );
        const productRatesMap = {};
        productRatesRes.rows.forEach(r => {
            productRatesMap[r.id] = r;
        });

        const enrichedLines = lines.map(line => {
            // 1. Sanitization: Force Numbers
            const accepted_qty = Number(line.accepted_qty) || 0;
            const rate = Number(line.rate) || 0;
            const discount_percent = Number(line.discount_percent) || 0;
            const discount_amount = Number(line.discount_amount) || 0;
            const scheme_amount = Number(line.scheme_amount) || 0;
            const tax_amount_line = Math.round((Number(line.tax_amount) || 0) * 100) / 100;

            // Recalculate Row Total for safety?
            // Amount = Taxable + Tax
            // Taxable = (Qty * Rate) - (Qty * Rate * Disc%) - Scheme
            // For now, we trust the Frontend's "Net Amount" logic to match the paper bill exactly, 
            // but we MUST ensure it is a valid Number type and rounded correctly.
            const amount = Math.round((Number(line.amount) || 0) * 100) / 100;

            const masterRates = productRatesMap[line.product_id] || {};
            
            // Forensic Unit Cost: (Amount - Tax) / Qty
            let net_purchase_rate = 0;
            if (accepted_qty > 0) {
                net_purchase_rate = (amount - tax_amount_line) / accepted_qty;
            } else {
                net_purchase_rate = rate; // Fallback to basic rate if qty is zero
            }

            return {
                ...line,
                product_id: Number(line.product_id),
                ordered_qty: Number(line.ordered_qty) || 0,
                accepted_qty: accepted_qty,
                rejected_qty: Number(line.rejected_qty) || 0,
                rate: rate,
                net_purchase_rate: net_purchase_rate,
                discount_percent: discount_percent,
                discount_amount: discount_amount,
                scheme_amount: scheme_amount,
                tax_amount: tax_amount_line,
                amount: amount,
                mrp: Number(line.mrp) || 0,
                // Fallback to master if frontend doesn't provide these
                distributor_rate: Number(line.distributor_rate) || Number(masterRates.distributor_rate) || 0,
                wholesale_rate: Number(line.wholesale_rate) || Number(masterRates.wholesale_rate) || 0,
                dealer_rate: Number(line.dealer_rate) || Number(masterRates.dealer_rate) || 0,
                retail_rate: Number(line.retail_rate) || Number(masterRates.retail_rate) || 0,
                // Dates: Handle empty strings
                expiry_date: (line.expiry_date === '' || !line.expiry_date) ? null : line.expiry_date,
                batch_number: line.batch_number || "DEFAULT"
            };
        });


        // 2. Sanitize Header Totals (Enforce Rounding for Ledger Consistency)
        const safe_total_net = Math.round((Number(req.body.total_net) || 0) * 100) / 100;
        const safe_tax = Math.round((Number(req.body.tax_amount) || 0) * 100) / 100;
        const safe_grand = Math.round(Number(req.body.grand_total) || 0); // Net Grand Total to nearest integer

        // Fix PO ID: Ensure '0' or 0 or '' becomes null
        const safe_po_id = (purchase_order_id && purchase_order_id !== 0 && purchase_order_id !== '0') ? Number(purchase_order_id) : null;

        // DEBUG
        console.log('--- PROCESSING GRN (Server Sanitized) ---');
        console.log({ vendor_id, safe_po_id, invoice_number, safe_grand });

        // Call the RPC we created
        const result = await pool.query(
            `SELECT create_purchase_invoice(
                $1::bigint,
                $2::bigint,
                $3::text,
                $4::date,
                $5::date,
                $6::numeric,
                $7::numeric,
                $8::numeric,
                $9::jsonb,
                $10::bigint
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

        // Allocate the reversal debit note fully to the reversed invoice to prevent leakage
        await client.query(`
            INSERT INTO debit_note_allocations (debit_note_id, purchase_invoice_id, amount)
            VALUES ($1, $2, $3)
        `, [dnId, id, invoice.grand_total]);

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

        // 5. Void Batches (Remove Stock) & Traceability
        const batchesToVoid = await client.query(`
            SELECT id, product_id, quantity_remaining 
            FROM inventory_batches 
            WHERE purchase_invoice_line_id IN (
                SELECT id FROM purchase_invoice_lines WHERE purchase_invoice_header_id = $1
            )
        `, [id]);

        for (const b of batchesToVoid.rows) {
            if (Number(b.quantity_remaining) > 0) {
                await client.query(`
                    INSERT INTO stock_traceability (
                        batch_id, product_id, quantity_change, transaction_type, 
                        reference_id, reference_type, notes
                    ) VALUES ($1, $2, $3, 'OUT', $4, 'Purchase Invoice Reversal', $5)
                `, [b.id, b.product_id, -Number(b.quantity_remaining), id, `GRN Reversal: ${invoice.invoice_number}`]);
            }
        }

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
        console.error("DEBUG Body Received:", req.body);
        res.status(500).json({ error: `Server Error: ${err.message}` });
    } finally {
        client.release();
    }
});

// @route   POST /api/purchase-invoices/:id/purge
// @desc    Hard Delete a GRN (Purchase Invoice) and log its history to deleted_grns_log
router.post('/:id/purge', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { reversed_by_id, reason } = req.body; // Using reversed_by_id as user ID for consistency with Retool/Appsmith schema

        if (!reversed_by_id) {
            return res.status(400).json({ error: 'User ID (reversed_by_id) is required for auditing' });
        }

        // 1. Fetch Invoice
        const invRes = await client.query(`SELECT * FROM purchase_invoice_headers WHERE id = $1`, [id]);
        if (invRes.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
        const invoice = invRes.rows[0];

        // 2. Check Stock Integrity (block if any stock was sold or moved)
        const batchCheck = await client.query(`
            SELECT COUNT(*) 
            FROM inventory_batches 
            WHERE purchase_invoice_line_id IN (
                SELECT id FROM purchase_invoice_lines WHERE purchase_invoice_header_id = $1
            ) 
            AND (quantity_initial - quantity_remaining) > 0
            AND is_active = true
        `, [id]);

        if (Number(batchCheck.rows[0].count) > 0) {
            return res.status(400).json({ error: 'Cannot Delete: Stock from this GRN has already been sold.' });
        }

        await client.query('BEGIN');

        // 3. Fetch Full Details to Serialize for Audit
        // Fetch Lines
        const linesRes = await client.query(`
            SELECT pil.*, ib.batch_code as batch_number 
            FROM purchase_invoice_lines pil
            LEFT JOIN inventory_batches ib ON ib.purchase_invoice_line_id = pil.id
            WHERE pil.purchase_invoice_header_id = $1
        `, [id]);
        const lines = linesRes.rows;

        // Fetch Journal Entries & Lines
        const journalRes = await client.query(`
            SELECT je.*, COALESCE(
                json_agg(jl.*) FILTER (WHERE jl.id IS NOT NULL), '[]'::json
            ) as lines
            FROM journal_entries je
            LEFT JOIN journal_lines jl ON je.id = jl.journal_entry_id
            WHERE je.reference_id = $1 AND je.reference_type = 'GRN'
            GROUP BY je.id
        `, [id]);
        const journals = journalRes.rows;

        const fullGrnData = {
            header: invoice,
            lines: lines,
            journals: journals
        };

        // 4. Insert Audit Log
        await client.query(`
            INSERT INTO deleted_grns_log 
            (deleted_by_id, reason, original_invoice_id, original_invoice_number, vendor_invoice_number, vendor_id, grand_total, original_grn_data)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            reversed_by_id,
            reason || 'GRN Hard Deletion (Purge)',
            id,
            invoice.invoice_number,
            invoice.vendor_invoice_number,
            invoice.vendor_id,
            invoice.grand_total,
            JSON.stringify(fullGrnData)
        ]);

        // 5. Hard Delete (Dependency Order)
        // A. Nullify parent_invoice_id in purchase_invoice_headers for child invoices
        await client.query(`UPDATE purchase_invoice_headers SET parent_invoice_id = NULL WHERE parent_invoice_id = $1`, [id]);

        // B. Nullify linked_invoice_id in debit_notes
        await client.query(`UPDATE debit_notes SET linked_invoice_id = NULL WHERE linked_invoice_id = $1`, [id]);

        // C. Delete from debit_note_allocations
        await client.query(`DELETE FROM debit_note_allocations WHERE purchase_invoice_id = $1`, [id]);

        // D. Delete from stock_traceability for associated batches
        await client.query(`
            DELETE FROM stock_traceability 
            WHERE batch_id IN (
                SELECT id FROM inventory_batches WHERE grn_id = $1
            )
        `, [id]);

        // E. Delete from inventory_batches
        await client.query(`DELETE FROM inventory_batches WHERE grn_id = $1`, [id]);

        // F. Delete from journal_entries (cascades to journal_lines)
        await client.query(`DELETE FROM journal_entries WHERE reference_id = $1 AND reference_type = 'GRN'`, [id]);

        // G. Delete from purchase_invoice_headers (cascades to purchase_invoice_lines and payment_allocations)
        await client.query(`DELETE FROM purchase_invoice_headers WHERE id = $1`, [id]);

        // H. Revert linked PO status to 'Approved' (so it can be inwarded again)
        if (invoice.purchase_order_id) {
            await client.query(`UPDATE purchase_order_headers SET status = 'Approved' WHERE id = $1`, [invoice.purchase_order_id]);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'GRN Hard-Deleted and Audited Successfully.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Purge GRN Error:", err.message);
        res.status(500).json({ error: `Server Error: ${err.message}` });
    } finally {
        client.release();
    }
});

// @route   GET /api/purchase-invoices/lines
// @desc    Get all Purchase Invoice Lines with vendor/date filters
router.get('/lines', async (req, res) => {
    try {
        const { vendor_id, start_date, end_date } = req.query;
        let queryParams = [];
        let whereConditions = [];
        let paramIdx = 1;

        if (vendor_id && vendor_id !== 'all' && vendor_id !== '') {
            queryParams.push(vendor_id);
            whereConditions.push(`pi.vendor_id = $${paramIdx}`);
            paramIdx++;
        }

        if (start_date) {
            queryParams.push(start_date);
            whereConditions.push(`pi.received_date >= $${paramIdx}::date`);
            paramIdx++;
        }

        if (end_date) {
            queryParams.push(end_date);
            whereConditions.push(`pi.received_date <= $${paramIdx}::date`);
            paramIdx++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
            SELECT 
                pl.id as line_id,
                pl.purchase_invoice_header_id,
                pi.invoice_number,
                pi.vendor_invoice_number,
                pi.vendor_invoice_date,
                pi.received_date,
                pi.vendor_id,
                v.vendor_name,
                pl.product_id,
                p.product_name,
                p.product_code,
                p.ean_code,
                pl.accepted_qty,
                pl.rate,
                pl.discount_percent,
                pl.discount_amount,
                pl.scheme_amount,
                pl.tax_amount,
                pl.amount as net_amount,
                (pl.amount - pl.tax_amount) as taxable_amount,
                COALESCE(t.tax_percentage, 0) as tax_percentage,
                ib.mrp,
                ib.batch_code,
                ib.expiry_date
            FROM purchase_invoice_lines pl
            JOIN purchase_invoice_headers pi ON pl.purchase_invoice_header_id = pi.id
            JOIN vendors v ON pi.vendor_id = v.id
            JOIN products p ON pl.product_id = p.id
            LEFT JOIN taxes t ON p.tax_id = t.id
            LEFT JOIN inventory_batches ib ON ib.purchase_invoice_line_id = pl.id
            ${whereClause}
            ORDER BY pi.id DESC, pl.id ASC
        `;

        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error("Fetch Purchase Invoice Lines Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
