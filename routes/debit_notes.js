const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// @route   GET /api/debit-notes/vendor/:id
// @desc    Get all Debit Notes for a Vendor
router.get('/vendor/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT dn.*, v.vendor_name, pi.invoice_number as linked_invoice_number
            FROM debit_notes dn
            JOIN vendors v ON dn.vendor_id = v.id
            LEFT JOIN purchase_invoice_headers pi ON dn.linked_invoice_id = pi.id
            WHERE dn.vendor_id = $1
            ORDER BY dn.debit_note_date DESC
        `, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error('List Debit Notes Error:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /api/debit-notes
// @desc    Create a new Debit Note (Financial Adjustment)
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            vendor_id,
            amount,
            debit_note_date,
            reason,
            linked_invoice_id
        } = req.body;

        if (!vendor_id || !amount || Number(amount) <= 0) {
            return res.status(400).json({ error: 'Vendor and Valid Amount required' });
        }

        // 0. Resolve Linked Invoice ID (Handle 'GD-CLT-PI...' string)
        let resolvedInvoiceId = null; // Default to null explicitly
        if (linked_invoice_id && isNaN(Number(linked_invoice_id))) {
            // It's a string (e.g., "GD-CLT-PI-26-12"), look up the ID
            const invRes = await client.query('SELECT id FROM purchase_invoice_headers WHERE invoice_number = $1', [linked_invoice_id]);
            if (invRes.rows.length > 0) {
                resolvedInvoiceId = invRes.rows[0].id;
            }
        } else if (linked_invoice_id) {
            resolvedInvoiceId = Number(linked_invoice_id);
        }

        await client.query('BEGIN');

        // 1. Generate Debit Note Number (Sequence Logic)
        const seqRes = await client.query(`
            SELECT prefix, current_number 
            FROM document_sequences 
            WHERE document_type = 'DN' AND is_active = true
            FOR UPDATE
        `);

        let dnNumber;
        if (seqRes.rows.length === 0) {
            // Fallback if seed missing
            dnNumber = `DN-${Date.now().toString().slice(-6)}`;
        } else {
            const seq = seqRes.rows[0];
            const nextNum = Number(seq.current_number) + 1;
            dnNumber = `${seq.prefix}${nextNum}`;

            // Update Sequence
            await client.query(`
               UPDATE document_sequences 
               SET current_number = $1
               WHERE document_type = 'DN'
           `, [nextNum]);
        }

        // 2. Insert Record
        const insertRes = await client.query(`
            INSERT INTO debit_notes 
            (vendor_id, debit_note_number, debit_note_date, amount, reason, linked_invoice_id, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'Approved')
            RETURNING id, debit_note_number
        `, [
            vendor_id,
            dnNumber,
            debit_note_date || new Date(),
            amount,
            reason,
            resolvedInvoiceId
        ]);
        const newId = insertRes.rows[0].id; // Capture ID

        // 3. Insert Lines (If any)
        const lines = req.body.lines || [];
        if (lines.length > 0) {
            for (const line of lines) {
                await client.query(`
                    INSERT INTO debit_note_lines 
                    (debit_note_id, product_id, qty, rate, amount, batch_number, return_type)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    newId,
                    line.product_id,
                    line.qty,
                    line.rate,
                    line.amount,
                    line.batch_number,
                    line.return_type || 'Damage'
                ]);
            }
        }

        // 4. SPILLOVER ALLOCATION LOGIC (Auto-Allocate)
        let remainingToAllocate = Number(amount);

        // A. Priority Allocation (Linked Bill)
        if (resolvedInvoiceId && remainingToAllocate > 0) {
            // Get Balance of Linked Bill
            const billRes = await client.query(`
                SELECT 
                    pi.id,
                    (pi.grand_total - COALESCE(pa.paid,0) - COALESCE(dn.applied,0)) as balance
                FROM purchase_invoice_headers pi
                LEFT JOIN (SELECT purchase_invoice_id, SUM(amount) as paid FROM payment_allocations GROUP BY purchase_invoice_id) pa ON pi.id = pa.purchase_invoice_id
                LEFT JOIN (SELECT purchase_invoice_id, SUM(amount) as applied FROM debit_note_allocations GROUP BY purchase_invoice_id) dn ON pi.id = dn.purchase_invoice_id
                WHERE pi.id = $1
            `, [resolvedInvoiceId]);

            if (billRes.rows.length > 0) {
                const bill = billRes.rows[0];
                const billBal = Number(bill.balance);
                if (billBal > 0) {
                    const alloc = Math.min(billBal, remainingToAllocate);
                    await client.query(`
                        INSERT INTO debit_note_allocations (debit_note_id, purchase_invoice_id, amount)
                        VALUES ($1, $2, $3)
                    `, [newId, resolvedInvoiceId, alloc]);
                    remainingToAllocate -= alloc;
                }
            }
        }

        // B. Spillover Allocation (FIFO on other bills)
        if (remainingToAllocate > 0) {
            // Fetch other pending bills for this vendor
            const pendingRes = await client.query(`
                SELECT 
                    pi.id,
                    (pi.grand_total - COALESCE(pa.paid,0) - COALESCE(dn.applied,0)) as balance
                FROM purchase_invoice_headers pi
                LEFT JOIN (SELECT purchase_invoice_id, SUM(amount) as paid FROM payment_allocations GROUP BY purchase_invoice_id) pa ON pi.id = pa.purchase_invoice_id
                LEFT JOIN (SELECT purchase_invoice_id, SUM(amount) as applied FROM debit_note_allocations GROUP BY purchase_invoice_id) dn ON pi.id = dn.purchase_invoice_id
                WHERE pi.vendor_id = $1 
                AND pi.status != 'Cancelled'
                AND (pi.grand_total - COALESCE(pa.paid,0) - COALESCE(dn.applied,0)) > 0
                AND ($2::integer IS NULL OR pi.id != $2::integer) -- Exclude the one we just allocated to
                ORDER BY pi.received_date ASC, pi.created_at ASC
            `, [vendor_id, resolvedInvoiceId]);

            for (const bill of pendingRes.rows) {
                if (remainingToAllocate <= 0.01) break;

                const billBal = Number(bill.balance);
                const alloc = Math.min(billBal, remainingToAllocate);

                if (alloc > 0) {
                    await client.query(`
                        INSERT INTO debit_note_allocations (debit_note_id, purchase_invoice_id, amount)
                        VALUES ($1, $2, $3)
                    `, [newId, bill.id, alloc]);
                    remainingToAllocate -= alloc;
                }
            }
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Debit Note Created',
            id: newId,
            dn_number: insertRes.rows[0].debit_note_number
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Create Debit Note Error:', err.message);
        res.status(500).json({ error: 'Server Error creating Debit Note', details: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
