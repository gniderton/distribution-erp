const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// @route   GET /api/vendor-payments/ledger/:vendor_id
// @desc    Get chronological ledger (Invoices, Payments, Returns)
router.get('/ledger/:vendor_id', async (req, res) => {
    try {
        const { vendor_id } = req.params;

        // Query the View we created
        const result = await pool.query(`
            SELECT * FROM view_vendor_ledger 
            WHERE vendor_id = $1 
            ORDER BY date DESC, created_at DESC
        `, [vendor_id]);

        // Calculate Running Balance in JS (easier than SQL window functions sometimes)
        // Or trust the frontend to do it. 
        // For now, raw data is best.
        res.json(result.rows);

    } catch (err) {
        console.error('Ledger Error:', err.message);
        res.status(500).json({ error: 'Server Error fetching ledger' });
    }
});


// @route   POST /api/vendor-payments
// @desc    Record a payment and allocate to bills
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            vendor_id,
            amount, // Total Payment Amount
            payment_date,
            mode,
            transaction_ref,
            remarks,
            allocations, // Array of { invoice_id, amount }
            transaction_type, // 'PAYMENT' (default) or 'REFUND' (Money In)
            bank_account_id, // [NEW] Optional Bank Account ID
            bank_statement_entry_id
        } = req.body;

        const type = (transaction_type === 'REFUND') ? 'REFUND' : 'PAYMENT';

        if (!vendor_id || !amount || Number(amount) <= 0) {
            return res.status(400).json({ error: 'Vendor and Valid Amount required' });
        }

        if (mode !== 'Cheque' && !bank_account_id) {
            return res.status(400).json({ error: 'Bank Account is required for Cash/Online payments' });
        }

        await client.query('BEGIN');

        // Resolve Bank Account & UTR ref dynamically if Online mode with Statement Entry selected
        let resolvedBankAccountId = bank_account_id;
        let resolvedTransactionRef = transaction_ref;
        if (mode && ['ONLINE', 'BANK TRANSFER', 'NEFT', 'UPI', 'RTGS', 'IMPS', 'NEFT/RTGS'].includes(mode.toUpperCase()) && bank_statement_entry_id) {
            const bseRes = await client.query('SELECT bank_account_id, bank_ref_id FROM bank_statement_entries WHERE id = $1', [bank_statement_entry_id]);
            if (bseRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Selected Bank Statement Entry not found' });
            }
            resolvedBankAccountId = bseRes.rows[0].bank_account_id;
            resolvedTransactionRef = bseRes.rows[0].bank_ref_id;
        }

        // 0.5 Generate Payment Number
        const seqRes = await client.query(`
            SELECT id, prefix, current_number 
            FROM document_sequences 
            WHERE document_type = 'PAY' AND is_active = true 
            FOR UPDATE
        `);

        let paymentNumber;
        if (seqRes.rows.length === 0) {
            paymentNumber = `PAY-${Date.now().toString().slice(-6)}`;
        } else {
            const seq = seqRes.rows[0];
            const nextNum = Number(seq.current_number) + 1;
            paymentNumber = `${seq.prefix}${nextNum}`;

            await client.query('UPDATE document_sequences SET current_number = $1 WHERE id = $2', [nextNum, seq.id]);
        }

        // 1. Create Payment Record (Linked to Bank)
        const paymentRes = await client.query(`
            INSERT INTO vendor_payments 
            (vendor_id, amount, payment_date, payment_mode, transaction_ref, remarks, transaction_type, bank_account_id, payment_number, bank_statement_entry_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, payment_number
        `, [vendor_id, amount, payment_date, mode, resolvedTransactionRef, remarks, type, resolvedBankAccountId, paymentNumber, bank_statement_entry_id]);

        const paymentId = paymentRes.rows[0].id;

        // 1b. Create Accounting Entry (Ledger)
        const acc_ap = 2001;
        const acc_bank = 1002;
        const acc_cash = 1003;
        const acc_cheque_issued = 2004;
        let ledgerLines = [];
        let description = '';

        const normalizedMode = (mode || '').toUpperCase();

        if (type === 'PAYMENT') {
            description = `Payment Out: ${paymentNumber}`;
            
            // Choose account based on mode
            let targetAcc = acc_bank;
            if (normalizedMode === 'CHEQUE') targetAcc = acc_cheque_issued;
            if (normalizedMode === 'CASH') targetAcc = acc_cash;

            // Dr Accounts Payable (Liability decreases), Cr Bank/Cash/Cheque Issued
            ledgerLines = [
                { code: acc_ap, debit: Number(amount), credit: 0 },
                { code: targetAcc, debit: 0, credit: Number(amount), bank_account_id: (normalizedMode === 'CHEQUE') ? null : resolvedBankAccountId }
            ];

            if (normalizedMode === 'CHEQUE') {
                const bId = (req.body.bank_id === 'undefined' || !req.body.bank_id) ? null : req.body.bank_id;
                await client.query(`
                    INSERT INTO cheques (
                        cheque_number, cheque_date, bank_id, bank_name, amount, 
                        type, party_type, party_id, reference_type, reference_id, status
                    ) VALUES ($1, $2, $3, $4, $5, 'OUTGOING', 'VENDOR', $6, 'VENDOR_PAYMENT', $7, 'PENDING')
                `, [
                    resolvedTransactionRef, 
                    req.body.cheque_date || payment_date, 
                    bId,
                    req.body.bank_name || 'Own Bank', 
                    amount, 
                    vendor_id, 
                    paymentId
                ]);
            }
        } else {
            description = `Refund In: ${paymentNumber}`;
            // Dr Bank/Cash (Asset increases), Cr Accounts Payable
            let targetAcc = (normalizedMode === 'CASH') ? acc_cash : acc_bank;

            ledgerLines = [
                { code: targetAcc, debit: Number(amount), credit: 0, bank_account_id: resolvedBankAccountId },
                { code: acc_ap, debit: 0, credit: Number(amount) }
            ];
        }

        await client.query(`
            SELECT create_journal_entry($1, $2, $3, $4, $5)
        `, [
            payment_date,
            description,
            'PURCH_PAY',
            paymentId,
            JSON.stringify(ledgerLines)
        ]);

        if (type === 'PAYMENT' && allocations && Array.isArray(allocations) && allocations.length > 0) {
            // SECURITY CHECK: Ensure user isn't allocating more than they paid
            const totalAllocated = allocations.reduce((sum, a) => sum + Number(a.amount || 0), 0);
            if (totalAllocated > (Number(amount) + 0.01)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: `Allocation Sum (${totalAllocated}) exceeds Payment Amount (${amount})` });
            }

            for (const alloc of allocations) {
                if (alloc.invoice_id && alloc.amount > 0) {
                    await client.query(`
                        INSERT INTO payment_allocations 
                        (payment_id, purchase_invoice_id, amount)
                        VALUES ($1, $2, $3)
                    `, [paymentId, alloc.invoice_id, alloc.amount]);
                }
            }
        }

        // 5. Handle Bank Statement Consumption (Online Mode)
        if (mode && ['ONLINE', 'BANK TRANSFER', 'NEFT', 'UPI', 'RTGS', 'IMPS', 'NEFT/RTGS'].includes(mode.toUpperCase()) && bank_statement_entry_id) {
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = COALESCE(consumed_amount, 0) + $1,
                    status = CASE 
                        WHEN (debit_amount - (COALESCE(consumed_amount, 0) + $1)) <= 0.01 THEN 'Exhausted'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [amount, bank_statement_entry_id]);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: 'Payment Recorded', id: paymentId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('--- VENDOR PAYMENT ERROR ---');
        console.error('Message:', err.message);
        console.error('Code:', err.code);
        console.error('Stack:', err.stack);
        res.status(500).json({
            error: 'Server Error recording payment',
            details: err.message,
            code: err.code
        });
    } finally {
        client.release();
    }
});

// @route   GET /api/vendor-payments/history/:vendor_id
// @desc    Get all payments for a specific vendor (Table view)
router.get('/history/:vendor_id', async (req, res) => {
    try {
        const { vendor_id } = req.params;
        const result = await pool.query(`
            SELECT 
                id, 
                payment_number, 
                payment_date, 
                amount, 
                payment_mode, 
                transaction_ref,
                remarks
            FROM vendor_payments
            WHERE vendor_id = $1 AND is_active = true
            ORDER BY payment_date DESC, created_at DESC
        `, [vendor_id]);

        res.json(result.rows);
    } catch (err) {
        console.error('Payment History Error:', err.message);
        res.status(500).json({ error: 'Server Error fetching payment history' });
    }
});

// @route   GET /api/vendor-payments/:payment_id/slip-details
// @desc    Get deep details for PDF generation (headers + allocations)
router.get('/:payment_id/slip-details', async (req, res) => {
    try {
        const { payment_id } = req.params;

        // 1. Fetch Header Info
        const headerRes = await pool.query(`
            SELECT 
                vp.id,
                vp.payment_number,
                vp.payment_date,
                vp.amount,
                vp.payment_mode,
                vp.transaction_ref as manual_ref,
                vp.remarks,
                v.vendor_name,
                v.vendor_code,
                v.gst as vendor_gst,
                v.pan as vendor_pan,
                va.address_line as vendor_address,
                va.city as vendor_city,
                ba.bank_name as bank_name,
                bse.bank_ref_id as stmt_ref
            FROM vendor_payments vp
            JOIN vendors v ON vp.vendor_id = v.id
            LEFT JOIN vendor_addresses va ON v.id = va.vendor_id 
            LEFT JOIN bank_accounts ba ON vp.bank_account_id = ba.id
            LEFT JOIN bank_statement_entries bse ON vp.bank_statement_entry_id = bse.id
            WHERE vp.id = $1
            LIMIT 1
        `, [payment_id]);

        if (headerRes.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const header = headerRes.rows[0];
        // Reference logic: Prefer stmt_ref, fallback to manual_ref
        header.final_ref = header.stmt_ref || header.manual_ref || '-';

        // 2. Fetch the "Simple" Allocations (Body of the Voucher)
        const simpleAllocRes = await pool.query(`
            SELECT 
                pih.received_date as invoice_date,
                pih.vendor_invoice_number as bill_no_vendor,
                pih.invoice_number as our_series,
                pih.grand_total as bill_amount,
                pa.amount as amount_paid
            FROM payment_allocations pa
            JOIN purchase_invoice_headers pih ON pa.purchase_invoice_id = pih.id
            WHERE pa.payment_id = $1
            ORDER BY pih.received_date ASC
        `, [payment_id]);

        // 3. Fetch the "Forensic" Details for each Invoice involved
        const reconRes = await pool.query(`
            SELECT 
                pih.id as invoice_id,
                pih.vendor_invoice_number as bill_no_vendor,
                pih.grand_total as bill_amount,
                -- Summary Stats: Sum of both Payments and Debit Notes
                (
                    SELECT COALESCE(SUM(amount), 0) 
                    FROM (
                        SELECT amount FROM payment_allocations WHERE purchase_invoice_id = pih.id
                        UNION ALL
                        SELECT amount FROM debit_note_allocations WHERE purchase_invoice_id = pih.id
                    ) t
                ) as total_paid_to_date,
                -- Unified History: All payments & adjustments
                (
                    SELECT json_agg(t ORDER BY t.date ASC) FROM (
                        SELECT 
                            vp2.payment_number as ref_no,
                            vp2.payment_date as date,
                            pa2.amount,
                            vp2.payment_mode as type
                        FROM payment_allocations pa2
                        JOIN vendor_payments vp2 ON pa2.payment_id = vp2.id
                        WHERE pa2.purchase_invoice_id = pih.id
                        
                        UNION ALL
                        
                        SELECT 
                            dn.debit_note_number as ref_no,
                            dn.debit_note_date as date,
                            dna.amount,
                            'Debit Note' as type
                        FROM debit_note_allocations dna
                        JOIN debit_notes dn ON dna.debit_note_id = dn.id
                        WHERE dna.purchase_invoice_id = pih.id
                    ) t
                ) as full_history
            FROM purchase_invoice_headers pih
            WHERE pih.id IN (SELECT purchase_invoice_id FROM payment_allocations WHERE payment_id = $1)
        `, [payment_id]);

        const invoice_reconciliation = reconRes.rows.map(row => ({
            ...row,
            balance_remaining: (Number(row.bill_amount) - Number(row.total_paid_to_date)).toFixed(2)
        }));

        res.json({
            header: header,
            allocations: simpleAllocRes.rows,
            invoice_reconciliation: invoice_reconciliation
        });

    } catch (err) {
        console.error('Slip Details Error:', err.message);
        res.status(500).json({ error: 'Server Error fetching slip details' });
    }
});

module.exports = router;
