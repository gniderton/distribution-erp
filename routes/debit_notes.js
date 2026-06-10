const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// @route   GET /api/debit-notes
// @desc    Get all Debit Notes (with optional vendor_id filter)
router.get('/', async (req, res) => {
    try {
        const { vendor_id } = req.query;
        let query = `
            SELECT 
                dn.*, 
                dn.note_type, 
                v.vendor_name, 
                v.gst as vendor_gst,
                v.contact_no as vendor_contact,
                v.email as vendor_email,
                va.address_line as vendor_address,
                va.city as vendor_city,
                va.district as vendor_district,
                va.state_code as vendor_state,
                va.pin_code as vendor_pin,
                pi.invoice_number as linked_invoice_number
            FROM debit_notes dn
            JOIN vendors v ON dn.vendor_id = v.id
            LEFT JOIN vendor_addresses va ON v.id = va.vendor_id AND va.is_default = true
            LEFT JOIN purchase_invoice_headers pi ON dn.linked_invoice_id = pi.id
        `;
        const params = [];

        if (vendor_id) {
            query += ` WHERE dn.vendor_id = $1`;
            params.push(vendor_id);
        }

        query += ` ORDER BY dn.debit_note_date DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('List Debit Notes Error:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   GET /api/debit-notes/vendor/:id
// @desc    Get all Debit Notes for a Vendor (Legacy)
router.get('/vendor/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT 
                dn.*, 
                v.vendor_name, 
                v.gst as vendor_gst,
                v.contact_no as vendor_contact,
                v.email as vendor_email,
                va.address_line as vendor_address,
                va.city as vendor_city,
                va.district as vendor_district,
                va.state_code as vendor_state,
                va.pin_code as vendor_pin,
                pi.invoice_number as linked_invoice_number
            FROM debit_notes dn
            JOIN vendors v ON dn.vendor_id = v.id
            LEFT JOIN vendor_addresses va ON v.id = va.vendor_id AND va.is_default = true
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
            linked_invoice_id,
            note_type = 'Debit Note' // Default to DN
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

        // 1. Generate Number (Sequence Logic)
        const docType = note_type === 'Return Slip' ? 'RS' : 'DN';
        const seqRes = await client.query(`
            SELECT prefix, current_number 
            FROM document_sequences 
            WHERE document_type = $1 AND is_active = true
            FOR UPDATE
        `, [docType]);

        let dnNumber;
        if (seqRes.rows.length === 0) {
            // Fallback if seed missing
            dnNumber = `${docType}-${Date.now().toString().slice(-6)}`;
        } else {
            const seq = seqRes.rows[0];
            const nextNum = Number(seq.current_number) + 1;
            dnNumber = `${seq.prefix}${nextNum}`;

            // Update Sequence
            await client.query(`
               UPDATE document_sequences 
               SET current_number = $1
               WHERE document_type = $2
           `, [nextNum, docType]);
        }

        // 2. Insert Record
        const insertRes = await client.query(`
            INSERT INTO debit_notes 
            (vendor_id, debit_note_number, debit_note_date, amount, reason, linked_invoice_id, status, note_type)
            VALUES ($1, $2, $3, $4, $5, $6, 'Approved', $7)
            RETURNING id, debit_note_number
        `, [
            vendor_id,
            dnNumber,
            debit_note_date || new Date(),
            amount,
            reason,
            resolvedInvoiceId,
            note_type
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

                // [FIX] Fetch Tax Info if not provided to ensure proper Ledger split
                let lineTaxPct = line.tax_percentage;
                let lineTaxAmt = line.tax_amount;

                if (lineTaxPct === undefined) {
                    const taxRes = await client.query(`
                        SELECT t.tax_percentage 
                        FROM products p 
                        LEFT JOIN taxes t ON p.tax_id = t.id 
                        WHERE p.id = $1
                    `, [line.product_id]);
                    lineTaxPct = taxRes.rows.length > 0 ? Number(taxRes.rows[0].tax_percentage) : 0;
                    line.tax_percentage = lineTaxPct;
                }

                if (lineTaxAmt === undefined) {
                    // Reverse calculate tax from Gross Amount
                    const taxable = lineAmount / (1 + (lineTaxPct / 100));
                    lineTaxAmt = lineAmount - taxable;
                    line.tax_amount = lineTaxAmt;
                }

                await client.query(`
                    INSERT INTO debit_note_lines 
                    (debit_note_id, product_id, qty, rate, amount, batch_number, return_type, tax_percentage, tax_amount)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    newId,
                    line.product_id,
                    line.qty,
                    line.rate,
                    lineAmount,
                    line.batch_number,
                    line.return_type || 'Damage',
                    lineTaxPct,
                    lineTaxAmt
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

                    // Enforce Strict Stock Validation
                    const totalAvailable = batches.rows.reduce((sum, b) => sum + Number(b.quantity_remaining), 0);
                    if (totalAvailable < remainingReturnQty) {
                        const prodRes = await client.query('SELECT product_name FROM products WHERE id = $1', [line.product_id]);
                        const prodName = prodRes.rows.length > 0 ? prodRes.rows[0].product_name : `ID: ${line.product_id}`;
                        throw new Error(`Insufficient stock for product "${prodName}": requested ${remainingReturnQty}, but only ${totalAvailable} is available.`);
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

                        // [NEW] Stock Traceability Log
                        await client.query(`
                            INSERT INTO stock_traceability (
                                batch_id, product_id, quantity_change, transaction_type, 
                                reference_id, reference_type, notes
                            ) VALUES ($1, $2, $3, 'OUT', $4, $5, $6)
                        `, [batch.id, line.product_id, -deduct, newId, note_type, `Purchase Return via ${dnNumber}`]);

                        remainingReturnQty -= deduct;
                    }

                    // 3. (Optional) warning if we tried to return more than we have in stock
                    // For now, we allow the Debit Note to be created even if stock is virtual/missing, 
                    // but we only deducted what we found.
                }
            }
        }

        // 4. SPILLOVER ALLOCATION LOGIC (Only for financial Debit Notes)
        if (note_type !== 'Return Slip') {
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
            let totalTax = 0;
            let totalTaxable = 0;

            for (const line of lines) {
                const lineAmt = Number(line.amount) || 0; // Gross
                const lineTax = Number(line.tax_amount) || 0;
                totalTax += lineTax;
                totalTaxable += (lineAmt - lineTax);
            }

            // Round to 2 decimals for safety
            totalTax = Number(totalTax.toFixed(2));
            totalTaxable = Number(totalTaxable.toFixed(2));

            if (totalTaxable < 0) totalTaxable = 0;

            ledgerLines = [
                { code: acc_ap, debit: Number(amount), credit: 0 },
                { code: acc_inventory, debit: 0, credit: totalTaxable }
            ];

            // --- GST SPLIT LOGIC ---
            let cgstVal = 0;
            let sgstVal = 0;
            let igstVal = 0;
            let posVal = '32'; // Default Kerala

            if (totalTax > 0) {
                // 1. Fetch Company State & Vendor GST
                const settingsRes = await client.query('SELECT state_code FROM company_settings LIMIT 1');
                const cmpState = (settingsRes.rows.length > 0) ? Number(settingsRes.rows[0].state_code) : 32;

                const vendRes = await client.query('SELECT gst FROM vendors WHERE id = $1', [vendor_id]);
                const vGst = vendRes.rows.length > 0 ? vendRes.rows[0].gst : '';

                let isIntra = false;
                // Extract Prefix
                if (vGst && vGst.length >= 2) {
                    posVal = vGst.substring(0, 2); // Capture POS
                    const vState = parseInt(posVal);
                    if (!isNaN(vState) && vState === cmpState) {
                        isIntra = true;
                    }
                }

                if (isIntra) {
                    const halfTax = Number((totalTax / 2).toFixed(2));
                    const otherHalf = Number((totalTax - halfTax).toFixed(2));

                    cgstVal = halfTax;
                    sgstVal = otherHalf;

                    const acc_cgst = 1011;
                    const acc_sgst = 1012;
                    ledgerLines.push({ code: acc_cgst, debit: 0, credit: halfTax });
                    ledgerLines.push({ code: acc_sgst, debit: 0, credit: otherHalf });
                } else {
                    igstVal = totalTax;

                    // IGST
                    ledgerLines.push({ code: acc_gst, debit: 0, credit: totalTax });
                }
            }
            // -----------------------

            // Update Header with Tax Info
            await client.query(`
                UPDATE debit_notes SET
                    taxable_amount = $1,
                    tax_amount = $2,
                    cgst_amount = $3,
                    sgst_amount = $4,
                    igst_amount = $5,
                    place_of_supply = $6
                WHERE id = $7
            `, [totalTaxable, totalTax, cgstVal, sgstVal, igstVal, posVal, newId]);

            // --- ROUNDING FIX ---
            const totalDebits = Number(amount);
            // Re-sum credits from actual ledger lines to be safe
            let totalCredits = 0;
            ledgerLines.forEach(l => {
                if (l.credit) totalCredits += l.credit;
            });
            totalCredits = Number(totalCredits.toFixed(2));

            const diff = Number((totalDebits - totalCredits).toFixed(2));
            const acc_rounding = 5003;

            if (diff !== 0) {
                if (diff > 0) {
                    ledgerLines.push({ code: acc_rounding, debit: 0, credit: diff });
                } else {
                    ledgerLines.push({ code: acc_rounding, debit: Math.abs(diff), credit: 0 });
                }
            }
        }

        if (note_type !== 'Return Slip') {
            await client.query(`
                SELECT create_journal_entry($1, $2, $3, $4, $5)
            `, [
                debit_note_date || new Date(),
                desc,
                'DN',
                newId,
                JSON.stringify(ledgerLines)
            ]);
        }

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


// @route   GET /api/debit-notes/:id/items
// @desc    Get all items for a specific Debit Note
router.get('/:id/items', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY dnl.id) as "S.No",
                p.ean_code as "EAN Code",
                p.product_code as "product_code",
                h.hsn_code as "hsn_code",
                p.product_name as "Item Name",
                COALESCE((SELECT mrp FROM inventory_batches WHERE batch_code = dnl.batch_number AND product_id = dnl.product_id LIMIT 1), p.mrp) as "MRP",
                dnl.rate as "Price",
                dnl.qty as "Qty",
                0 as "Sch",
                0 as "Disc %",
                t.tax_percentage as "GST %",
                (dnl.qty * dnl.rate) as "Gross $",
                0 as "Disc. $",
                ROUND((dnl.amount / (1 + (COALESCE(t.tax_percentage, 0)/100.0)))::numeric, 2) as "Taxable $",
                ROUND((dnl.amount - (dnl.amount / (1 + (COALESCE(t.tax_percentage, 0)/100.0))))::numeric, 2) as "GST $",
                dnl.amount as "Net $",
                dnl.batch_number as "Batch No",
                (SELECT expiry_date FROM inventory_batches WHERE batch_code = dnl.batch_number AND product_id = dnl.product_id LIMIT 1) as "Expiry",
                dnl.product_id as "_product_id"
            FROM debit_note_lines dnl
            JOIN products p ON dnl.product_id = p.id
            LEFT JOIN taxes t ON p.tax_id = t.id
            LEFT JOIN hsn_codes h ON p.hsn_id = h.id
            WHERE dnl.debit_note_id = $1
        `, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error('List Debit Note Items Error:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /api/debit-notes/:id/convert
// @desc    Convert a Return Slip to a financial Debit Note
router.post('/:id/convert', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        // 1. Fetch the Return Slip
        const rsRes = await client.query(`
            SELECT * FROM debit_notes 
            WHERE id = $1 AND note_type = 'Return Slip'
        `, [id]);

        if (rsRes.rows.length === 0) {
            return res.status(404).json({ error: 'Valid Return Slip not found' });
        }

        const rs = rsRes.rows[0];
        const oldRSNumber = rs.debit_note_number;

        // Fetch lines for accounting
        const linesRes = await client.query(`
            SELECT * FROM debit_note_lines WHERE debit_note_id = $1
        `, [id]);
        const lines = linesRes.rows;

        await client.query('BEGIN');

        // 2. Generate new DN Number
        const seqRes = await client.query(`
            SELECT prefix, current_number 
            FROM document_sequences 
            WHERE document_type = 'DN' AND is_active = true
            FOR UPDATE
        `);

        let dnNumber;
        if (seqRes.rows.length === 0) {
            dnNumber = `DN-${Date.now().toString().slice(-6)}`;
        } else {
            const seq = seqRes.rows[0];
            const nextNum = Number(seq.current_number) + 1;
            dnNumber = `${seq.prefix}${nextNum}`;
            await client.query(`
                UPDATE document_sequences SET current_number = $1 WHERE document_type = 'DN'
            `, [nextNum]);
        }

        // 3. Update the record
        await client.query(`
            UPDATE debit_notes 
            SET 
                note_type = 'Debit Note', 
                debit_note_number = $1,
                converted_from_rs = $2,
                status = 'Approved'
            WHERE id = $3
        `, [dnNumber, oldRSNumber, id]);

        // [FIX] Update tax values in header from lines if they are 0
        // This ensures the Ledger entry below has the correct CGST/SGST/IGST breakdown
        const taxTotalsRes = await client.query(`
            SELECT 
                SUM(tax_amount) as total_tax,
                SUM(amount - tax_amount) as total_taxable
            FROM debit_note_lines 
            WHERE debit_note_id = $1
        `, [id]);
        
        const totals = taxTotalsRes.rows[0];
        if (Number(totals.total_tax) > 0) {
            // Re-fetch vendor info to determine GST type
            const vendRes = await client.query('SELECT gst FROM vendors WHERE id = $1', [rs.vendor_id]);
            const vGst = vendRes.rows.length > 0 ? vendRes.rows[0].gst : '';
            
            const settingsRes = await client.query('SELECT state_code FROM company_settings LIMIT 1');
            const cmpState = (settingsRes.rows.length > 0) ? Number(settingsRes.rows[0].state_code) : 32;

            let isIntra = false;
            let posVal = '32';
            if (vGst && vGst.length >= 2) {
                posVal = vGst.substring(0, 2);
                if (parseInt(posVal) === cmpState) isIntra = true;
            }

            let cgst = 0, sgst = 0, igst = 0;
            const tTax = Number(totals.total_tax);
            if (isIntra) {
                cgst = Number((tTax / 2).toFixed(2));
                sgst = Number((tTax - cgst).toFixed(2));
            } else {
                igst = tTax;
            }

            await client.query(`
                UPDATE debit_notes SET
                    taxable_amount = $1,
                    tax_amount = $2,
                    cgst_amount = $3,
                    sgst_amount = $4,
                    igst_amount = $5,
                    place_of_supply = $6
                WHERE id = $7
            `, [totals.total_taxable, tTax, cgst, sgst, igst, posVal, id]);
            
            // Update the rs object so the ledger logic below uses the fresh values
            rs.cgst_amount = cgst;
            rs.sgst_amount = sgst;
            rs.igst_amount = igst;
            rs.tax_amount = tTax;
            rs.taxable_amount = totals.total_taxable;
        }

        // 4. FINANCIAL LOGIC (Allocation)
        const amount = Number(rs.amount);
        let remainingToAllocate = amount;
        const resolvedInvoiceId = rs.linked_invoice_id;
        const vendor_id = rs.vendor_id;

        if (resolvedInvoiceId && remainingToAllocate > 0) {
            const billRes = await client.query(`
                SELECT pi.id, (pi.grand_total - COALESCE(pa.paid,0) - COALESCE(dn.applied,0)) as balance
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
                    `, [id, resolvedInvoiceId, alloc]);
                    remainingToAllocate -= alloc;
                }
            }
        }

        if (remainingToAllocate > 0) {
            const pendingRes = await client.query(`
                SELECT pi.id, (pi.grand_total - COALESCE(pa.paid,0) - COALESCE(dn.applied,0)) as balance
                FROM purchase_invoice_headers pi
                LEFT JOIN (SELECT purchase_invoice_id, SUM(amount) as paid FROM payment_allocations GROUP BY purchase_invoice_id) pa ON pi.id = pa.purchase_invoice_id
                LEFT JOIN (SELECT purchase_invoice_id, SUM(amount) as applied FROM debit_note_allocations GROUP BY purchase_invoice_id) dn ON pi.id = dn.purchase_invoice_id
                WHERE pi.vendor_id = $1 AND pi.status != 'Cancelled'
                AND (pi.grand_total - COALESCE(pa.paid,0) - COALESCE(dn.applied,0)) > 0
                AND ($2::integer IS NULL OR pi.id != $2::integer)
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
                    `, [id, bill.id, alloc]);
                    remainingToAllocate -= alloc;
                }
            }
        }

        // 5. ACCOUNTING LOGIC (Ledger)
        const acc_ap = 2001;
        const acc_inventory = 1001;
        const acc_discount = 4002;
        const acc_gst = 1010;

        let ledgerLines = [];
        let desc = `Converted from RS: ${oldRSNumber} -> ${dnNumber}`;

        if (lines.length === 0) {
            ledgerLines = [
                { code: acc_ap, debit: amount, credit: 0 },
                { code: acc_discount, debit: 0, credit: amount }
            ];
        } else {
            let totalTax = 0;
            let totalTaxable = 0;
            for (const line of lines) {
                const lineAmt = Number(line.amount) || 0;
                const lineTax = Number(line.tax_amount) || 0;
                totalTax += lineTax;
                totalTaxable += (lineAmt - lineTax);
            }
            totalTax = Number(totalTax.toFixed(2));
            totalTaxable = Number(totalTaxable.toFixed(2));

            ledgerLines = [
                { code: acc_ap, debit: amount, credit: 0 },
                { code: acc_inventory, debit: 0, credit: totalTaxable }
            ];

            if (totalTax > 0) {
                const cgstVal = Number(rs.cgst_amount) || 0;
                const sgstVal = Number(rs.sgst_amount) || 0;
                const igstVal = Number(rs.igst_amount) || 0;

                if (igstVal > 0) {
                    ledgerLines.push({ code: acc_gst, debit: 0, credit: igstVal });
                } else {
                    ledgerLines.push({ code: 1011, debit: 0, credit: cgstVal });
                    ledgerLines.push({ code: 1012, debit: 0, credit: sgstVal });
                }
            }

            const totalDebits = amount;
            let totalCredits = ledgerLines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
            const diff = Number((totalDebits - totalCredits).toFixed(2));
            if (diff !== 0) {
                ledgerLines.push({ code: 5003, debit: diff > 0 ? 0 : Math.abs(diff), credit: diff > 0 ? diff : 0 });
            }
        }

        await client.query(`
            SELECT create_journal_entry($1, $2, $3, $4, $5)
        `, [
            rs.debit_note_date,
            desc,
            'DN',
            id,
            JSON.stringify(ledgerLines)
        ]);

        await client.query('COMMIT');
        res.json({ success: true, debit_note_number: dnNumber });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Conversion Error:', err);
        res.status(500).json({ error: 'Conversion failed: ' + err.message });
    } finally {
        client.release();
    }
});

// @route   POST /api/debit-notes/:id/reverse
// @desc    Forensic Reversal of a Debit Note (Undo Financial & Stock impact)
router.post('/:id/reverse', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { reversed_by_id } = req.body;

        if (!reversed_by_id) {
            return res.status(400).json({ error: 'Reversed By ID is required' });
        }

        await client.query('BEGIN');

        // 1. Fetch & Validate Debit Note
        const dnRes = await client.query(`SELECT * FROM debit_notes WHERE id = $1 FOR UPDATE`, [id]);
        if (dnRes.rows.length === 0) return res.status(404).json({ error: 'Debit Note not found' });
        const dn = dnRes.rows[0];

        if (dn.status === 'Reversed' || dn.status === 'Cancelled') {
            return res.status(400).json({ error: 'Debit Note is already reversed or cancelled' });
        }

        // 2. REVERSE ALLOCATIONS
        // This makes the bills look "Unpaid" again
        await client.query(`DELETE FROM debit_note_allocations WHERE debit_note_id = $1`, [id]);

        // 3. REVERSE STOCK (If itemized)
        const traceRes = await client.query(`
            SELECT batch_id, product_id, ABS(quantity_change) as qty
            FROM stock_traceability
            WHERE reference_id = $1
            AND reference_type = $2
            AND transaction_type = 'OUT'
        `, [id, dn.note_type]);

        if (traceRes.rows.length > 0) {
            for (const trace of traceRes.rows) {
                await client.query(`
                    UPDATE inventory_batches 
                    SET quantity_remaining = quantity_remaining + $1 
                    WHERE id = $2
                `, [trace.qty, trace.batch_id]);

                await client.query(`
                    INSERT INTO stock_traceability (
                        batch_id, product_id, quantity_change, transaction_type, 
                        reference_id, reference_type, notes
                    ) VALUES ($1, $2, $3, 'IN', $4, 'Debit Note Reversal', $5)
                `, [trace.batch_id, trace.product_id, trace.qty, id, `Reversal of DN: ${dn.debit_note_number}`]);
            }
        } else {
            // Fallback for legacy debit notes without traceability records
            const linesRes = await client.query(`SELECT * FROM debit_note_lines WHERE debit_note_id = $1`, [id]);
            for (const line of linesRes.rows) {
                if (line.qty > 0) {
                    const restoreRes = await client.query(`
                        UPDATE inventory_batches 
                        SET quantity_remaining = quantity_remaining + $1 
                        WHERE batch_code = $2 AND product_id = $3
                        AND (grn_id IS NOT NULL OR is_active = true)
                        RETURNING id
                    `, [line.qty, line.batch_number, line.product_id]);

                    if (restoreRes.rows.length > 0) {
                        const batchId = restoreRes.rows[0].id;
                        await client.query(`
                            INSERT INTO stock_traceability (
                                batch_id, product_id, quantity_change, transaction_type, 
                                reference_id, reference_type, notes
                            ) VALUES ($1, $2, $3, 'IN', $4, 'Debit Note Reversal', $5)
                        `, [batchId, line.product_id, line.qty, id, `Reversal of DN: ${dn.debit_note_number} (Legacy Fallback)`]);
                    }
                }
            }
        }

        // 4. REVERSE ACCOUNTING (Ledger)
        // Find existing journal entry
        const journalRes = await client.query(`SELECT * FROM journal_entries WHERE reference_id = $1 AND reference_type = 'DN'`, [id]);
        if (journalRes.rows.length > 0) {
            const originalJournal = journalRes.rows[0];
            
            // Generate Reversal description
            const revDesc = `REVERSAL: ${originalJournal.description}`;
            
            // Flip Debits and Credits
            const originalLines = originalJournal.ledger_lines || [];
            const reversedLines = originalLines.map(line => ({
                code: line.code,
                debit: line.credit || 0,
                credit: line.debit || 0
            }));

            // Create Reversing Journal Entry
            await client.query(`SELECT create_journal_entry($1, $2, $3, $4, $5)`, [
                new Date(),
                revDesc,
                'DN_REV',
                id,
                JSON.stringify(reversedLines)
            ]);
        }

        // 5. UPDATE STATUS
        await client.query(`
            UPDATE debit_notes 
            SET status = 'Reversed', reversed_at = NOW(), reversed_by_id = $1 
            WHERE id = $2
        `, [reversed_by_id, id]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Debit Note Reversed Successfully. Financial and Stock impacts rolled back.' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Debit Note Reversal Error:', err);
        res.status(500).json({ error: 'Reversal failed: ' + err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
