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
            amount: rawAmount, // Rename destructured var
            debit_note_date,
            reason,
            linked_invoice_id
        } = req.body;

        const amount = Math.round(Number(rawAmount)); // Enforce Rounding

        if (!vendor_id || !amount || amount <= 0) {
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
                // Determine if we need to reduce stock
                // Logic: If 'Good Stock' or Specific Batch provided, we deduct.
                // Even 'Damage' returns typically reduce 'inventory_batches' because the item PHYSICALLY leaves.

                // Round Line Amount
                const lineAmount = Math.round(Number(line.amount));

                await client.query(`
                    INSERT INTO debit_note_lines 
                    (debit_note_id, product_id, qty, rate, amount, batch_number, return_type)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    newId,
                    line.product_id,
                    line.qty,
                    line.rate,
                    lineAmount,
                    line.batch_number,
                    line.return_type || 'Damage'
                ]);

                // --- STOCK DEDUCTION LOGIC (FIFO) ---
                let remainingReturnQty = Number(line.qty);

                if (remainingReturnQty > 0) {
                    // 1. Fetch Candidates (FIFO: Oldest First)
                    // We must filter by the requested STATUS (Good vs Damage)
                    // 'return_type' from frontend maps to 'status' in DB
                    // Helper to build and run query
                    // Helper to build and run query
                    const findBatches = async (targetStatus) => {
                        const fs = require('fs');
                        let q = `
                            SELECT id, quantity_remaining, batch_code 
                            FROM inventory_batches 
                            WHERE product_id = $1 AND quantity_remaining > 0 
                        `;
                        const p = [line.product_id];

                        // Debug Log
                        fs.appendFileSync('debug_dn.txt', `\n[${new Date().toISOString()}] Searching: Prod=${line.product_id}, Status=${targetStatus}, Batch=${line.batch_number}\n`);

                        if (targetStatus) {
                            q += ` AND status = $${p.length + 1}`;
                            p.push(targetStatus);
                        }

                        if (line.batch_number && line.batch_number.trim() !== '') {
                            q += ` AND batch_code = $${p.length + 1}`;
                            p.push(line.batch_number.trim());
                        }

                        q += ` ORDER BY created_at ASC FOR UPDATE`;

                        fs.appendFileSync('debug_dn.txt', `Query: ${q} \nParams: ${JSON.stringify(p)}\n`);

                        return await client.query(q, p);
                    };

                    // 1. Try Primary Status (e.g. 'Damage')
                    let batches = await findBatches(line.return_type);
                    require('fs').appendFileSync('debug_dn.txt', `Primary Search Valid Batches: ${batches.rows.length}\n`);

                    // 2. Fallback to 'Good' if no stock found
                    if (batches.rows.length === 0 && line.return_type !== 'Good') {
                        require('fs').appendFileSync('debug_dn.txt', `Triggering Fallback to 'Good'\n`);
                        batches = await findBatches('Good');
                        require('fs').appendFileSync('debug_dn.txt', `Fallback Search Valid Batches: ${batches.rows.length}\n`);
                    }

                    // 2. Deduct from Batches
                    for (const batch of batches.rows) {
                        if (remainingReturnQty <= 0) break;

                        const available = Number(batch.quantity_remaining);
                        const deduct = Math.min(available, remainingReturnQty);

                        require('fs').appendFileSync('debug_dn.txt', `Deducting ${deduct} from BatchID ${batch.id} (Available: ${available})\n`);

                        // A. Deduct from Batch
                        await client.query(`
                            UPDATE inventory_batches 
                            SET quantity_remaining = quantity_remaining - $1 
                            WHERE id = $2
                        `, [deduct, batch.id]);

                        remainingReturnQty -= deduct;
                    }

                    // 3. (Optional) warning if we tried to return more than we have in stock
                    // For now, we allow the Debit Note to be created even if stock is virtual/missing, 
                    // but we only deducted what we found.
                }
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

        // 5. Accounting Entry (Ledger)
        const acc_ap = 2001;
        const acc_inventory = 1001;
        const acc_discount = 4002;
        const acc_gst = 1010; // Defaulting to IGST for now

        let ledgerLines = [];
        let desc = '';

        if (lines.length === 0) {
            // Case A: Financial Debit Note (No Items)
            desc = `Financial DN: ${dnNumber}`;
            ledgerLines = [
                { code: acc_ap, debit: Number(amount), credit: 0 },
                { code: acc_discount, debit: 0, credit: Number(amount) }
            ];
        } else {
            // Case B: Purchase Return (Itemized)
            desc = `Purchase Return: ${dnNumber}`;

            // Calculate Split (Inventory vs Tax)
            // We rely on 'line.tax_amount' from frontend, or default to 0 tax.
            let totalTax = 0;
            let totalTaxable = 0;

            for (const line of lines) {
                const lineAmt = Number(line.amount) || 0; // Gross
                const lineTax = Number(line.tax_amount) || 0;
                totalTax += lineTax;
                totalTaxable += (lineAmt - lineTax);
            }

            // Validation fallback: If calculation seems off (e.g. tax > amount), just put all to stock
            if (totalTaxable < 0) totalTaxable = 0;

            ledgerLines = [
                { code: acc_ap, debit: Number(amount), credit: 0 },
                { code: acc_inventory, debit: 0, credit: totalTaxable }
            ];

            if (totalTax > 0) {
                ledgerLines.push({ code: acc_gst, debit: 0, credit: totalTax });
            }
        }

        await client.query(`
            SELECT create_journal_entry($1, $2, $3, $4, $5)
        `, [
            debit_note_date || new Date(),
            desc,
            'DN',
            newId,
            JSON.stringify(ledgerLines)
        ]);

        await client.query('COMMIT');
        res.json({ success: true, id: newId, message: 'Debit Note Created', debit_note_number: dnNumber });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Debit Note Create Error:', err);
        res.status(500).json({ error: 'Server Error ' + err.message });
    } finally {
        client.release();
    }
});

// PUT /api/debit-notes/:id - Restricted Edit (Date/Reason)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { debit_note_date, reason } = req.body;

        const result = await pool.query(`
            UPDATE debit_notes 
            SET 
                debit_note_date = COALESCE($1, debit_note_date),
                reason = COALESCE($2, reason)
            WHERE id = $3
            RETURNING *
        `, [debit_note_date, reason, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Debit Note not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Update DN Error:", err.message);
        res.status(500).json({ error: 'Server Error updating Debit Note' });
    }
});

module.exports = router;
