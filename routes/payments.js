const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/payments - List Payments (Filtered)
router.get('/', async (req, res) => {
    try {
        const { limit = 50, offset = 0, route_id, date, days, status } = req.query;

        let query = `
            SELECT cp.*, c.customer_name
            FROM customer_payments cp
            JOIN customers c ON cp.customer_id = c.id
        `;
        const params = [];
        const where = [];
        let pIdx = 1;

        if (status) { where.push(`cp.status = $${pIdx}`); params.push(status); pIdx++; }
        if (route_id) { where.push(`c.route_id = $${pIdx}`); params.push(route_id); pIdx++; }
        if (date) { where.push(`cp.payment_date = $${pIdx}`); params.push(date); pIdx++; }
        if (days) { where.push(`cp.created_at >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'`); }

        if (where.length > 0) query += ` WHERE ${where.join(' AND ')}`;

        query += ` ORDER BY cp.created_at DESC LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/payments/ledger/:customerId
router.get('/ledger/:customerId', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT vl.*, c.customer_name 
            FROM view_customer_ledger vl
            JOIN customers c ON vl.customer_id = c.id
            WHERE vl.customer_id = $1 
            ORDER BY vl.id DESC LIMIT 50
        `, [req.params.customerId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/payments/invoices/:customerId (For selection)
router.get('/invoices/:customerId', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT si.*, (si.grand_total - COALESCE(si.amount_paid, 0)) as balance, c.customer_name
            FROM sales_invoices si
            JOIN customers c ON si.customer_id = c.id
            WHERE si.customer_id = $1 AND si.status != 'Paid'
            ORDER BY si.invoice_date ASC
        `, [req.params.customerId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/payments/validate-sync - DSE Sync Validation
router.post('/validate-sync', async (req, res) => {
    try {
        const { customer_id, amount, allocations, offline_id } = req.body;

        // Check for duplicate offline_id
        if (offline_id) {
            const dupCheck = await pool.query(
                'SELECT id, payment_number FROM customer_payments WHERE offline_id = $1',
                [offline_id]
            );
            if (dupCheck.rows.length > 0) {
                return res.json({
                    valid: false,
                    duplicate: true,
                    existing_payment: dupCheck.rows[0],
                    message: `Payment already synced as ${dupCheck.rows[0].payment_number}`
                });
            }
        }

        const conflicts = [];
        const totalPaid = Number(amount);
        let totalAllocated = 0;

        // Validate each allocation
        if (allocations && allocations.length > 0) {
            for (const alloc of allocations) {
                totalAllocated += Number(alloc.allocated_amount);

                // Get current invoice balance
                const invRes = await pool.query(`
                    SELECT id, invoice_number, 
                           (grand_total - COALESCE(amount_paid, 0)) as current_balance,
                           grand_total, amount_paid
                    FROM sales_invoices 
                    WHERE id = $1 AND customer_id = $2
                `, [alloc.invoice_id, customer_id]);

                if (invRes.rows.length === 0) {
                    conflicts.push({
                        invoice_id: alloc.invoice_id,
                        invoice_number: alloc.invoice_number,
                        reason: "Invoice not found or belongs to different customer",
                        allocated_amount: alloc.allocated_amount,
                        excess_amount: alloc.allocated_amount,
                        severity: 'ERROR'
                    });
                    continue;
                }

                const inv = invRes.rows[0];
                const currentBalance = Number(inv.current_balance);
                const allocatedAmount = Number(alloc.allocated_amount);
                const expectedBalance = Number(alloc.invoice_balance_at_entry || 0);

                // Check if allocated amount exceeds current balance
                if (allocatedAmount > currentBalance + 0.01) { // 1 paisa tolerance
                    const reason = await getBalanceChangeReason(alloc.invoice_id, expectedBalance, currentBalance);

                    conflicts.push({
                        invoice_id: alloc.invoice_id,
                        invoice_number: alloc.invoice_number,
                        expected_balance: expectedBalance,
                        current_balance: currentBalance,
                        allocated_amount: allocatedAmount,
                        excess_amount: allocatedAmount - currentBalance,
                        reason: reason,
                        severity: 'CONFLICT'
                    });
                }
            }
        }

        // Check if total allocation matches payment amount
        if (Math.abs(totalAllocated - totalPaid) > 0.01 && allocations && allocations.length > 0) {
            return res.json({
                valid: false,
                allocation_mismatch: true,
                total_paid: totalPaid,
                total_allocated: totalAllocated,
                difference: totalPaid - totalAllocated,
                message: "Total allocation does not match payment amount"
            });
        }

        // If conflicts found, provide suggestions
        if (conflicts.length > 0) {
            const suggestions = await generateSuggestions(conflicts, customer_id, totalPaid);

            return res.json({
                valid: false,
                conflicts,
                suggestions,
                message: `${conflicts.length} conflict(s) detected. Please resolve before syncing.`
            });
        }

        // All validations passed
        res.json({
            valid: true,
            message: "All allocations valid. Ready to sync.",
            total_allocated: totalAllocated,
            advance_amount: totalPaid - totalAllocated
        });

    } catch (err) {
        console.error("Validation Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Helper: Get reason for balance change
async function getBalanceChangeReason(invoiceId, expectedBalance, currentBalance) {
    const diff = expectedBalance - currentBalance;

    // Check for debit notes
    const dnRes = await pool.query(`
        SELECT dn.debit_note_number, SUM(dnl.amount) as total_amount
        FROM debit_notes dn
        JOIN debit_note_lines dnl ON dn.id = dnl.debit_note_id
        WHERE dnl.invoice_id = $1 AND dn.status != 'Cancelled'
        GROUP BY dn.debit_note_number
        ORDER BY dn.created_at DESC
        LIMIT 1
    `, [invoiceId]);

    if (dnRes.rows.length > 0) {
        const dn = dnRes.rows[0];
        return `Debit Note ${dn.debit_note_number} applied (₹${Number(dn.total_amount).toFixed(2)})`;
    }

    // Check for other payments
    const payRes = await pool.query(`
        SELECT p.payment_number, pa.amount
        FROM payment_allocations pa
        JOIN customer_payments p ON pa.payment_id = p.id
        WHERE pa.invoice_id = $1 AND pa.status = 'ACTIVE'
        ORDER BY p.created_at DESC
        LIMIT 1
    `, [invoiceId]);

    if (payRes.rows.length > 0) {
        const pay = payRes.rows[0];
        return `Payment ${pay.payment_number} applied (₹${Number(pay.amount).toFixed(2)})`;
    }

    return `Balance changed by ₹${Math.abs(diff).toFixed(2)}`;
}

// Helper: Generate resolution suggestions
async function generateSuggestions(conflicts, customerId, totalPaid) {
    const suggestions = [];

    // Get other unpaid invoices
    const unpaidRes = await pool.query(`
        SELECT id, invoice_number, (grand_total - COALESCE(amount_paid, 0)) as balance
        FROM sales_invoices 
        WHERE customer_id = $1 AND status != 'Paid'
        ORDER BY invoice_date ASC
        LIMIT 5
    `, [customerId]);

    const totalExcess = conflicts.reduce((sum, c) => sum + (c.excess_amount || 0), 0);

    // Suggestion 1: Adjust to next bills
    if (unpaidRes.rows.length > 0) {
        suggestions.push({
            type: 'ADJUST_TO_NEXT',
            message: `Allocate excess ₹${totalExcess.toFixed(2)} to other unpaid invoices`,
            available_invoices: unpaidRes.rows.map(inv => ({
                invoice_id: inv.id,
                invoice_number: inv.invoice_number,
                balance: Number(inv.balance)
            }))
        });
    }

    // Suggestion 2: Create advance
    suggestions.push({
        type: 'CREATE_ADVANCE',
        message: `Keep ₹${totalExcess.toFixed(2)} as advance payment`,
        advance_amount: totalExcess
    });

    // Suggestion 3: Cancel sync
    suggestions.push({
        type: 'CANCEL_SYNC',
        message: "Cancel sync and review with customer"
    });

    return suggestions;
}

// POST /api/payments - Hybrid FIFO Allocation
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            customer_id, amount, payment_mode,
            transaction_ref, collected_by, payment_date,
            allocations, // [NEW] DSE-specified allocations
            offline_id, // [NEW] DSE offline tracking ID
            location_lat, location_lng
        } = req.body;

        const totalPaid = Number(amount);
        if (totalPaid <= 0) return res.status(400).json({ error: 'Invalid amount' });

        await client.query('BEGIN');

        // 1. Generate Payment Number (PAY-YY-SEQ)
        const yy = new Date().getFullYear().toString().slice(-2);
        const seqRes = await client.query("SELECT COUNT(*) FROM customer_payments WHERE payment_number LIKE $1", [`PAY-${yy}-%`]);
        let nextSeq = parseInt(seqRes.rows[0].count) + 1;
        let payNumber;
        let check;
        do {
            payNumber = `PAY-${yy}-${String(nextSeq).padStart(4, '0')}`;
            check = await client.query("SELECT id FROM customer_payments WHERE payment_number = $1", [payNumber]);
            if (check.rows.length > 0) nextSeq++;
        } while (check.rows.length > 0);

        // 2. Create Payment Record (Pending Verification)
        const payRes = await client.query(`
            INSERT INTO customer_payments (
                payment_number, customer_id, amount, payment_mode, 
                transaction_ref, collected_by, payment_date, 
                verification_status, offline_id,
                location_lat, location_lng
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending', $8, $9, $10)
            RETURNING id
        `, [
            payNumber, customer_id, totalPaid, payment_mode,
            transaction_ref, collected_by, payment_date || new Date(),
            offline_id,
            location_lat, location_lng
        ]);
        const paymentId = payRes.rows[0].id;

        // [NEW] Store DSE-specified allocations with PENDING status
        if (allocations && allocations.length > 0) {
            for (const alloc of allocations) {
                await client.query(`
                    INSERT INTO payment_allocations (
                        payment_id, invoice_id, amount, status, expected_invoice_balance
                    ) VALUES ($1, $2, $3, 'PENDING', $4)
                `, [
                    paymentId,
                    alloc.invoice_id,
                    alloc.allocated_amount,
                    alloc.invoice_balance_at_entry
                ]);
            }
        }

        /* ============================================================
         * ALLOCATION LOGIC DISABLED - NOW HAPPENS AT VERIFICATION
         * ============================================================
         * This logic has been moved to payment_reconciliation.js
         * Allocations only happen AFTER finance team verifies payment
         * ============================================================
         
        let remainingToAllocate = totalPaid;
        const allocations = [];

        // 3. PHASE 1: Selected Invoices (Priority)
        if (invoices && Array.isArray(invoices) && invoices.length > 0) {
            const selectedRes = await client.query(`
                SELECT id, invoice_number, grand_total, COALESCE(amount_paid, 0) as amount_paid 
                FROM sales_invoices 
                WHERE id = ANY($1::int[]) AND status != 'Paid'
                ORDER BY invoice_date ASC
            `, [invoices]);

            for (const inv of selectedRes.rows) {
                if (remainingToAllocate <= 0) break;

                const balance = Number(inv.grand_total) - Number(inv.amount_paid);
                if (balance <= 0) continue;

                const allocate = Math.min(remainingToAllocate, balance);

                allocations.push({ invoice_id: inv.id, amount: allocate });
                remainingToAllocate -= allocate;
            }
        }

        // 4. PHASE 2: FIFO Overflow (Oldest Unpaid First)
        if (remainingToAllocate > 0) {
            const unpaidRes = await client.query(`
                SELECT id, invoice_number, grand_total, COALESCE(amount_paid, 0) as amount_paid 
                FROM sales_invoices 
                WHERE customer_id = $1 AND status != 'Paid'
                ORDER BY invoice_date ASC
            `, [customer_id]);

            for (const inv of unpaidRes.rows) {
                if (remainingToAllocate <= 0) break;

                const existingAlloc = allocations.find(a => a.invoice_id === inv.id);
                const alreadyAllocated = existingAlloc ? existingAlloc.amount : 0;

                const balance = (Number(inv.grand_total) - Number(inv.amount_paid)) - alreadyAllocated;

                if (balance <= 0) continue;

                const allocate = Math.min(remainingToAllocate, balance);

                if (existingAlloc) {
                    existingAlloc.amount += allocate;
                } else {
                    allocations.push({ invoice_id: inv.id, amount: allocate });
                }

                remainingToAllocate -= allocate;
            }
        }

        // 5. Commit Allocations to DB
        for (const alloc of allocations) {
            // A. Create Allocation Record
            await client.query(`
                INSERT INTO payment_allocations (payment_id, invoice_id, amount)
                VALUES ($1, $2, $3)
            `, [paymentId, alloc.invoice_id, alloc.amount]);

            // B. Update Invoice Balance
            await client.query(`
                UPDATE sales_invoices 
                SET amount_paid = COALESCE(amount_paid, 0) + $1,
                    status = CASE 
                        WHEN (grand_total - (COALESCE(amount_paid, 0) + $1)) <= 1 THEN 'Paid' -- Tolerance
                        ELSE 'Partial' 
                    END
                WHERE id = $2
            `, [alloc.amount, alloc.invoice_id]);
        }

        ============================================================ */


        /* ============================================================
         * GL ENTRY DISABLED - NOW HAPPENS AT VERIFICATION
         * ============================================================
         * GL entry is now posted in payment_reconciliation.js
         * Only VERIFIED payments hit the general ledger
         * ============================================================
         
        // --- ACCOUNTING INTEGRATION ---
        const acc_ar = 1101;
        const acc_bank = 1002;
        const acc_cash = 1003;

        const targetAcc = (payment_mode === 'Cash') ? acc_cash : acc_bank;

        const roundedPaid = Number(totalPaid.toFixed(2));
        const ledgerLines = [
            { code: targetAcc, debit: roundedPaid, credit: 0 },
            { code: acc_ar, debit: 0, credit: roundedPaid }
        ];

        await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)',
            [payment_date || new Date(), `Customer Payment: ${payNumber}`, 'CUST_PAY', paymentId, JSON.stringify(ledgerLines)]);

        ============================================================ */


        await client.query('COMMIT');

        const totalAllocated = allocations ? allocations.reduce((sum, a) => sum + Number(a.allocated_amount), 0) : 0;
        const advanceAmount = totalPaid - totalAllocated;

        res.status(201).json({
            success: true,
            id: paymentId,
            payment_number: payNumber,
            verification_status: 'Pending',
            allocations_count: allocations?.length || 0,
            total_allocated: totalAllocated,
            advance_amount: advanceAmount,
            message: allocations && allocations.length > 0
                ? `Payment created with ${allocations.length} allocation(s). Awaiting finance verification.`
                : 'Payment created as advance. Awaiting finance verification.'
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Payment Error:", err);
        res.status(500).json({ error: err.stack || err.message });
    } finally {
        client.release();
    }
});

// PATCH /api/payments/:id/verify-cheque - Capture Cheque Image & Auto-Verify
router.patch('/:id/verify-cheque', async (req, res) => {
    try {
        const { id } = req.params;
        const { cheque_image_url, verified_by } = req.body;

        if (!cheque_image_url) return res.status(400).json({ error: 'Cheque image is required' });

        // Logic: For now, we set status to Verified once image is provided.
        // In a future phase, we can integrate OCR here to match the cheque_number.
        const result = await pool.query(`
            UPDATE customer_payments 
            SET cheque_image_url = $1, 
                verification_status = 'Verified', 
                verified_at = NOW(),
                verified_by = $2
            WHERE id = $3
            RETURNING *
        `, [cheque_image_url, verified_by, id]);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Payment not found' });

        res.json({ success: true, payment: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/payments/:id/verify-cash - Denomination Validation
router.patch('/:id/verify-cash', async (req, res) => {
    try {
        const { id } = req.params;
        const { denominations, verified_by } = req.body; // Obj: { 500: 2, 200: 5, ... }

        if (!denominations) return res.status(400).json({ error: 'Denominations are required' });

        // 1. Fetch Payment Amount
        const payRes = await pool.query('SELECT amount FROM customer_payments WHERE id = $1', [id]);
        if (payRes.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
        const targetAmount = Number(payRes.rows[0].amount);

        // 2. Calculate Total from Denominations
        const denomValues = {
            500: 500, 200: 200, 100: 100, 50: 50, 20: 20, 10: 10, 5: 5, 2: 2, 1: 1
        };
        let calcTotal = 0;
        for (const [key, qty] of Object.entries(denominations)) {
            if (denomValues[key]) {
                calcTotal += (Number(qty) * denomValues[key]);
            }
        }

        // 3. Match Check
        if (Math.abs(calcTotal - targetAmount) > 0.01) {
            return res.status(400).json({
                error: `Denomination total (${calcTotal}) does not match payment amount (${targetAmount})`
            });
        }

        // 4. Update
        const result = await pool.query(`
            UPDATE customer_payments 
            SET verification_data = $1, 
                verification_status = 'Verified', 
                verified_at = NOW(),
                verified_by = $2
            WHERE id = $3
            RETURNING *
        `, [JSON.stringify(denominations), verified_by, id]);

        res.json({ success: true, payment: result.rows[0] });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/payments/:id/verify-online - Bank Statement Auto-Matching
router.patch('/:id/verify-online', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { verified_by } = req.body;

        await client.query('BEGIN');

        // 1. Get Payment Details
        const payRes = await client.query('SELECT * FROM customer_payments WHERE id = $1', [id]);
        if (payRes.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
        const payment = payRes.rows[0];

        if (!payment.transaction_ref) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Payment has no transaction reference to match' });
        }

        // 2. Search Bank Statement for Ref ID
        // Note: Reference IDs can sometimes be slightly different (case/whitespace), so we use ILIKE/TRIM
        const bankRes = await client.query(`
            SELECT * FROM bank_statement_entries 
            WHERE TRIM(bank_ref_id) ILIKE TRIM($1)
              AND status != 'Exhausted'
            ORDER BY transaction_date DESC LIMIT 1
        `, [payment.transaction_ref]);

        if (bankRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                error: `No matching entry found in bank statement for Ref: ${payment.transaction_ref}`
            });
        }

        const bankEntry = bankRes.rows[0];
        const payAmount = Number(payment.amount);
        const availableAmount = Number(bankEntry.credit_amount) - Number(bankEntry.consumed_amount);

        // 3. Check if available amount in bank entry is sufficient
        if (availableAmount < payAmount - 0.01) { // Allowing tiny floating point diff
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Bank entry exists but has insufficient balance. Required: ${payAmount}, Available: ${availableAmount.toFixed(2)}`
            });
        }

        // 4. Verification Update
        const updatedPay = await client.query(`
            UPDATE customer_payments 
            SET bank_statement_entry_id = $1, 
                verification_status = 'Verified', 
                verified_at = NOW(),
                verified_by = $2
            WHERE id = $3
            RETURNING *
        `, [bankEntry.id, verified_by, id]);

        // 5. Bank Statement Update
        const newConsumed = Number(bankEntry.consumed_amount) + payAmount;
        let newStatus = 'Partially Consumed';
        if (Math.abs(newConsumed - Number(bankEntry.credit_amount)) < 0.01) {
            newStatus = 'Exhausted';
        }

        await client.query(`
            UPDATE bank_statement_entries 
            SET consumed_amount = $1, 
                status = $2 
            WHERE id = $3
        `, [newConsumed, newStatus, bankEntry.id]);

        await client.query('COMMIT');
        res.json({ success: true, payment: updatedPay.rows[0], matched_bank_id: bankEntry.id });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// [NEW] OCR Cheque Extraction (Proxy/Mock for DSE App)
router.post('/ocr-cheque', async (req, res) => {
    try {
        const { image_base64 } = req.body;

        if (!image_base64) return res.status(400).json({ error: 'Image data required' });

        // Logic: In a real implementation, you would send image_base64 to 
        // Google Vision, AWS Textract, or OpenAI Vision here.

        // MOCK RESPONSE for Retool UI Development
        // This allows the user to build the "Match" logic immediately.
        const mockResult = {
            cheque_number: "223344",
            bank_name: "IDFC First Bank",
            amount: 1500.00,
            confidence: 0.98
        };

        console.log('OCR Mock Triggered');
        res.json(mockResult);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
