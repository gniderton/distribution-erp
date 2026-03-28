const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// POST /api/dse/eod-sync - Submit End of Day Report
// Handles Orders, Payments, Expenses, and Denominations in ONE Transaction
// GET /api/dse/reports - List Daily Sales Reports
router.get('/reports', async (req, res) => {
    try {
        const { start, end, dse } = req.query;
        let query = `
            SELECT dsr.*, e.full_name as dse_name
            FROM daily_sales_reports dsr
            JOIN employees e ON dsr.dse_id = e.id
            WHERE 1=1
        `;
        const params = [];

        if (start && end) {
            query += ` AND dsr.report_date BETWEEN $${params.length + 1} AND $${params.length + 2}`;
            params.push(start, end);
        }

        if (dse) {
            query += ` AND dsr.dse_id = $${params.length + 1}`;
            params.push(dse);
        }

        query += ` ORDER BY dsr.report_date DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/dse/eod-sync - Submit End of Day Report
router.post('/eod-sync', async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const {
            dse_id,
            date,
            orders = [],
            payments = [],
            expenses = [],
            denominations = {} // Obj { note_500: 10, total: 5000 }
        } = req.body;

        // --- 0. Create Master Sync Log ---
        const summary = {
            orders_count: orders?.length || 0,
            payments_count: payments?.length || 0,
            expenses_count: expenses?.length || 0,
            has_denominations: !!denominations
        };
        const syncRes = await client.query(
            "INSERT INTO sync_logs (synced_by, payload_summary, sync_type) VALUES ($1, $2, 'Sales') RETURNING id",
            [dse_id, JSON.stringify(summary)]
        );
        const syncId = syncRes.rows[0].id;

        // --- 0.1 Create/Find Daily Sales Report Record ---
        // We create it first to get the reportId for child records.
        // We set sync_id so the report record itself is traceable.
        const dsrRes = await client.query(`
            INSERT INTO daily_sales_reports (dse_id, report_date, sync_id, settlement_status)
            VALUES ($1, $2, $3, 'Pending')
            RETURNING id
        `, [dse_id, date, syncId]);
        const reportId = dsrRes.rows[0].id;

        // --- 1. Process Orders ---
        let totalOrderValue = 0;
        for (const order of orders) {
            // A. Duplication Check (Idempotency) using offline_id
            const existing = await client.query('SELECT id FROM sales_orders WHERE offline_id = $1', [order.offline_no]);
            if (existing.rows.length > 0) {
                console.log(`Order ${order.offline_no} already synced. Skipping.`);
                continue;
            }

            // B. Calculate Order Total (Re-verify backend side for safety)
            const order_items = order.items || order.lines || []; // Handle naming diff
            const calculatedTotal = order_items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.rate)), 0);
            totalOrderValue += calculatedTotal;

            // B2. Generate SO Number
            const seqRes = await client.query(`
                UPDATE document_sequences 
                SET current_number = current_number + 1 
                WHERE document_type = 'Sales Order' 
                RETURNING prefix, current_number
            `);

            let soNumber;
            if (seqRes.rows.length === 0) {
                // If not exists, insert and start at 1
                await client.query(`
                    INSERT INTO document_sequences (company_settings_id, branch_id, document_type, prefix, current_number, is_active)
                    VALUES (1, 1, 'Sales Order', 'SO', 1, true)
                `);
                soNumber = 'SO-00001';
            } else {
                const { prefix, current_number } = seqRes.rows[0];
                soNumber = `${prefix}-${String(current_number).padStart(5, '0')}`;
            }

            // C. Insert Header + sync_id + report_id
            const oRes = await client.query(`
                INSERT INTO sales_orders (
                    dse_id, customer_id, order_date, total_amount, offline_id, status, latitude, longitude, so_number, sync_id, report_id
                ) VALUES ($1, $2, $3, $4, $5, 'Confirmed', $6, $7, $8, $9, $10)
                RETURNING id
            `, [dse_id, order.customer_id, date, calculatedTotal, order.offline_no, order.latitude || null, order.longitude || null, soNumber, syncId, reportId]);

            const newOrderId = oRes.rows[0].id;

            // D. Insert Lines
            for (const line of order_items) {
                const pId = line.product_id || line.id;
                const qty = Number(line.qty || line.quantity);
                const rate = Number(line.rate);
                const amount = qty * rate;

                if (qty > 0) {
                    await client.query(`
                        INSERT INTO sales_order_lines (
                            sales_order_id, product_id, ordered_qty, rate, amount
                        ) VALUES ($1, $2, $3, $4, $5)
                    `, [newOrderId, pId, qty, rate, amount]);
                }
            }
        }

        // --- 1B. Process Payments (UPDATED for Allocation System) ---
        for (const pay of payments) {
            // Check for duplicate using offline_id
            if (pay.offline_id) {
                const dupCheck = await client.query(
                    'SELECT id FROM customer_payments WHERE offline_id = $1',
                    [pay.offline_id]
                );
                if (dupCheck.rows.length > 0) {
                    console.log(`Payment ${pay.offline_id} already synced. Skipping.`);
                    continue;
                }
            }

            // Generate Payment Number (PAY-YY-SEQ)
            const yy = new Date().getFullYear().toString().slice(-2);
            const seqRes = await client.query(
                "SELECT COUNT(*) FROM customer_payments WHERE payment_number LIKE $1",
                [`PAY-${yy}-%`]
            );
            let nextSeq = parseInt(seqRes.rows[0].count) + 1;
            let payNumber;
            let check;
            do {
                payNumber = `PAY-${yy}-${String(nextSeq).padStart(4, '0')}`;
                check = await client.query(
                    "SELECT id FROM customer_payments WHERE payment_number = $1",
                    [payNumber]
                );
                if (check.rows.length > 0) nextSeq++;
            } while (check.rows.length > 0);

            // Insert payment with report_id
            try {
                const payRes = await client.query(`
                    INSERT INTO customer_payments (
                        payment_number, customer_id, collected_by, amount, payment_mode, payment_date, 
                        transaction_ref, bank_name, cheque_date, deposit_bank,
                        verification_status, offline_id, sync_id, report_id
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', $11, $12, $13)
                    RETURNING id
                `, [
                    payNumber,
                    pay.customer_id,
                    dse_id,
                    pay.amount,
                    pay.mode,
                    date,
                    pay.transaction_ref || null,
                    pay.bank_name || null,
                    pay.cheque_date || null,
                    pay.deposit_bank || null,
                    pay.offline_id || null,
                    syncId,
                    reportId
                ]);

                const paymentId = payRes.rows[0].id;
                console.log(`Payment created: ${payNumber} (ID: ${paymentId})`);

                if (pay.allocations && pay.allocations.length > 0) {
                    for (const alloc of pay.allocations) {
                        await client.query(`
                        INSERT INTO customer_payment_allocations (
                            payment_id, invoice_id, amount, status, expected_invoice_balance
                        ) VALUES ($1, $2, $3, 'PENDING', $4)
                    `, [
                            paymentId,
                            alloc.invoice_id,
                            alloc.allocated_amount,
                            alloc.invoice_balance_at_entry || null
                        ]);
                    }
                } else if (pay.invoice_id) {
                    await client.query(`
                    INSERT INTO customer_payment_allocations (
                        payment_id, invoice_id, amount, status, expected_invoice_balance
                    ) VALUES ($1, $2, $3, 'PENDING', NULL)
                `, [
                        paymentId,
                        pay.invoice_id,
                        pay.amount
                    ]);
                }
            } catch (paymentError) {
                console.error('Payment insertion error:', paymentError);
                throw new Error(`Failed to insert payment: ${paymentError.message}`);
            }
        }

        // --- 2. Process Expenses ---
        let totalExpense = 0;
        for (const exp of expenses) {
            await client.query(`
                INSERT INTO dse_expenses (
                    dse_id, expense_date, expense_type, amount, description, sync_id, report_id, 
                    payment_mode, bank_account_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                dse_id, date, exp.type, exp.amount, exp.description, syncId, reportId,
                exp.payment_mode || 'Cash', exp.bank_account_id || null
            ]);
            totalExpense += parseFloat(exp.amount || 0);
        }

        // --- 3. Insert Denominations ---
        await client.query(`
            INSERT INTO cash_denominations (
                dse_id, report_date, 
                note_500, note_200, note_100, note_50, note_20, note_10, coins, total_amount, sync_id, report_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
            dse_id, date,
            denominations[500] || 0, denominations[200] || 0, denominations[100] || 0,
            denominations[50] || 0, denominations[20] || 0, denominations[10] || 0,
            denominations.coins || 0, denominations.total || 0, syncId, reportId
        ]);

        // --- 4. Finalize Daily Sales Report Totals ---
        const totalCash = payments.filter(p => p.mode === 'Cash').reduce((acc, p) => acc + (p.amount || 0), 0);
        const totalCheque = payments.filter(p => p.mode === 'Cheque').reduce((acc, p) => acc + (p.amount || 0), 0);
        const totalOnline = payments.filter(p => p.mode === 'Online').reduce((acc, p) => acc + (p.amount || 0), 0);

        await client.query(`
            UPDATE daily_sales_reports SET
                total_orders = $1,
                total_order_value = $2,
                total_collection_cash = $3,
                total_collection_cheque = $4,
                total_collection_online = $5,
                total_expense = $6,
                submitted_at = NOW()
            WHERE id = $7
        `, [
            orders.length, totalOrderValue,
            totalCash, totalCheque, totalOnline,
            totalExpense,
            reportId
        ]);

        await client.query('COMMIT');

        res.json({
            success: true,
            sync_id: syncId,
            report_id: reportId,
            message: 'EOD Report Submitted Successfully'
        });

    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// POST /api/dse/expenses/:id/authorize - Authorize Expense (Manager)
router.post('/expenses/:id/authorize', async (req, res) => {
    const { id } = req.params;
    const { status, reason, user_id } = req.body; // status: 'Authorized' | 'Rejected'

    try {
        if (!['Authorized', 'Rejected'].includes(status)) {
            return res.status(400).json({ error: "Msg: Invalid status. Use Authorized or Rejected" });
        }

        // Map 'Authorized' to 'Verified' for DB constraint
        const dbStatus = (status === 'Authorized') ? 'Verified' : status;

        const result = await pool.query(`
            UPDATE dse_expenses 
            SET status = $1, rejection_reason = $2, verified_by = $3, verified_at = NOW()
            WHERE id = $4
            RETURNING *
        `, [dbStatus, reason || null, user_id, id]);

        if (result.rows.length === 0) return res.status(404).json({ error: "Expense not found" });

        // Update DSR Auth Status if needed (logic can be refined to check all expenses)
        // For now, simpler approach: The finalizing gate checks if ALL are good.

        res.json({ success: true, expense: result.rows[0] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/dse/reports/:id/finalize - Strict Settlement Gate
router.post('/reports/:id/finalize', async (req, res) => {
    const { id } = req.params;
    const { settled_by, finance_remark } = req.body;

    if (!settled_by) return res.status(400).json({ error: 'settled_by is required' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get Report & Configuration
        const reportRes = await client.query('SELECT * FROM daily_sales_reports WHERE id = $1', [id]);
        if (reportRes.rows.length === 0) throw new Error('Report not found');
        const report = reportRes.rows[0];

        if (report.settlement_status === 'Settled') throw new Error('Report is already Settled');

        // 2. GATE A: Check Payments (Must be 100% Verified)
        const pendingPay = await client.query(`
            SELECT COUNT(*) as cnt FROM customer_payments 
            WHERE collected_by = $1 AND payment_date = $2 AND verification_status != 'Verified'
        `, [report.dse_id, report.report_date]);

        if (parseInt(pendingPay.rows[0].cnt) > 0) {
            throw new Error(`Cannot finalize: ${pendingPay.rows[0].cnt} payments are still Pending/Rejected.`);
        }

        // 3. GATE B: Check Expenses (Must be Authorized/Verified)
        // Rule: All expenses must be 'Verified' OR 'Authorized' or 'Rejected' (Processed)
        // Pending is NOT allowed.
        const pendingExp = await client.query(`
            SELECT COUNT(*) as cnt FROM dse_expenses 
            WHERE dse_id = $1 AND expense_date = $2 AND status = 'Pending'
        `, [report.dse_id, report.report_date]);

        if (parseInt(pendingExp.rows[0].cnt) > 0) {
            throw new Error(`Cannot finalize: ${pendingExp.rows[0].cnt} expenses are still Pending review.`);
        }

        // 5. Finalize
        await client.query(`
            UPDATE daily_sales_reports 
            SET settlement_status = 'Settled', 
                finance_remark = $1,
                settled_at = NOW(),
                settled_by = $2
            WHERE id = $3
        `, [finance_remark, settled_by, id]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Report Settled Successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(409).json({ error: err.message }); // 409 Conflict for Gate Failures
    } finally {
        client.release();
    }
});

module.exports = router;
