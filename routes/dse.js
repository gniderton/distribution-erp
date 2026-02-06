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

            // C. Insert Header
            const orderRes = await client.query(`
                INSERT INTO sales_orders (
                    dse_id, customer_id, order_date, total_amount, offline_id, status, latitude, longitude, so_number
                ) VALUES ($1, $2, $3, $4, $5, 'Confirmed', $6, $7, $8)
                RETURNING id
            `, [dse_id, order.customer_id, date, calculatedTotal, order.offline_no, order.latitude || null, order.longitude || null, soNumber]);

            const newOrderId = orderRes.rows[0].id;

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

        // --- 1B. Process Payments (UPDATED) ---
        for (const pay of payments) {
            const payRes = await client.query(`
                INSERT INTO customer_payments (
                    customer_id, collected_by, amount, payment_mode, payment_date, 
                    transaction_ref, bank_name, cheque_date, deposit_bank,
                    verification_status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pending')
                RETURNING id
             `, [
                pay.customer_id,
                dse_id,
                pay.amount,
                pay.mode,
                date,
                pay.transaction_ref || null,
                pay.bank_name || null,
                pay.cheque_date || null,
                pay.deposit_bank || null
            ]);

            const paymentId = payRes.rows[0].id;

            // Optional: Allocation to an invoice if invoice_id provided
            if (pay.invoice_id) {
                await client.query(`
                    INSERT INTO customer_payment_allocations (payment_id, invoice_id, amount)
                    VALUES ($1, $2, $3)
                `, [paymentId, pay.invoice_id, pay.amount]);
            }
        }

        // --- 2. Insert Expenses ---
        let totalExpense = 0;
        for (const exp of expenses) {
            await client.query(`
                INSERT INTO dse_expenses (dse_id, expense_date, expense_type, amount, description)
                VALUES ($1, $2, $3, $4, $5)
            `, [dse_id, date, exp.type, exp.amount, exp.description]);
            totalExpense += parseFloat(exp.amount || 0);
        }

        // --- 3. Insert Denominations ---
        await client.query(`
            INSERT INTO cash_denominations (
                dse_id, report_date, 
                note_500, note_200, note_100, note_50, note_20, note_10, coins, total_amount
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            dse_id, date,
            denominations[500] || 0, denominations[200] || 0, denominations[100] || 0,
            denominations[50] || 0, denominations[20] || 0, denominations[10] || 0,
            denominations.coins || 0, denominations.total || 0
        ]);

        // --- 4. Create Daily Sales Report ---
        // Calculate Totals from passed arrays (or DB queries if possible)
        const totalCash = payments.filter(p => p.mode === 'Cash').reduce((acc, p) => acc + (p.amount || 0), 0);
        const totalCheque = payments.filter(p => p.mode === 'Cheque').reduce((acc, p) => acc + (p.amount || 0), 0);
        const totalOnline = payments.filter(p => p.mode === 'Online').reduce((acc, p) => acc + (p.amount || 0), 0);

        const reportRes = await client.query(`
            INSERT INTO daily_sales_reports (
                dse_id, report_date, 
                total_orders, total_order_value,
                total_collection_cash, total_collection_cheque, total_collection_online,
                total_expense
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (dse_id, report_date) DO UPDATE SET
                total_orders = EXCLUDED.total_orders,
                total_order_value = EXCLUDED.total_order_value,
                total_collection_cash = EXCLUDED.total_collection_cash,
                total_collection_cheque = EXCLUDED.total_collection_cheque,
                total_collection_online = EXCLUDED.total_collection_online,
                total_expense = EXCLUDED.total_expense,
                submitted_at = NOW()
            RETURNING id
        `, [
            dse_id, date,
            orders.length, totalOrderValue,
            totalCash, totalCheque, totalOnline,
            totalExpense
        ]);

        await client.query('COMMIT');

        res.json({
            success: true,
            report_id: reportRes.rows[0].id,
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

// POST /api/dse/reports/:id/finalize - Strict Settlement Gate
router.post('/reports/:id/finalize', async (req, res) => {
    try {
        const { id } = req.params;
        const { settled_by } = req.body;

        if (!settled_by) return res.status(400).json({ error: 'settled_by (Employee ID) is required' });

        // 1. Get Report Info
        const reportRes = await pool.query('SELECT * FROM daily_sales_reports WHERE id = $1', [id]);
        if (reportRes.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
        const report = reportRes.rows[0];

        // 2. CHECK: Are all payments verified?
        const pendingRes = await pool.query(`
            SELECT id, payment_number, customer_id, amount, payment_mode
            FROM customer_payments 
            WHERE collected_by = $1 
              AND payment_date = $2
              AND verification_status != 'Verified'
        `, [report.dse_id, report.report_date]);

        if (pendingRes.rows.length > 0) {
            return res.status(400).json({
                error: 'Cannot finalize report. Unverified payments found.',
                pending_payments: pendingRes.rows
            });
        }

        // 3. Finalize
        await pool.query(`
            UPDATE daily_sales_reports 
            SET settlement_status = 'Settled', 
                settled_at = NOW(),
                settled_by = $1
            WHERE id = $2
        `, [settled_by, id]);

        res.json({ success: true, message: 'Report Settled Successfully' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
