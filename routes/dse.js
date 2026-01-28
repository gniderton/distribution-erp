const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// POST /api/dse/eod-sync - Submit Daily Report
router.post('/eod-sync', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            dse_id,
            report_date,           // 'YYYY-MM-DD'
            total_sales,           // Calculated by App
            total_collection,      // Calculated by App
            total_cash,            // Calculated by App
            expenses,              // Array: [{ description, amount, type }]
            denominations          // Array: [{ value: 500, count: 10 }, ...]
        } = req.body;

        await client.query('BEGIN');

        // 1. Calculate Total Expense
        let expenseTotal = 0;
        if (expenses && expenses.length > 0) {
            expenseTotal = expenses.reduce((sum, rx) => sum + Number(rx.amount), 0);
        }

        // 2. Calculate Cash to Submit
        const cashToSubmit = Number(total_cash) - expenseTotal;

        // 3. Create Report Header
        const repRes = await client.query(`
            INSERT INTO daily_sales_reports (
                dse_id, report_date, 
                total_sales_amount, total_payment_collection, total_cash_collected,
                total_expense_claimed, cash_to_submit,
                status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending')
            ON CONFLICT (dse_id, report_date) 
            DO UPDATE SET 
                total_sales_amount = EXCLUDED.total_sales_amount,
                total_payment_collection = EXCLUDED.total_payment_collection,
                total_cash_collected = EXCLUDED.total_cash_collected,
                total_expense_claimed = EXCLUDED.total_expense_claimed,
                cash_to_submit = EXCLUDED.cash_to_submit,
                updated_at = NOW(),
                status = 'Pending' -- Reset status on update
            RETURNING id
        `, [
            dse_id, report_date,
            total_sales, total_collection, total_cash,
            expenseTotal, cashToSubmit
        ]);

        const reportId = repRes.rows[0].id;

        // 4. Insert Expenses
        // Clear old expenses first (if re-syncing)
        await client.query('DELETE FROM dse_expenses WHERE report_id = $1', [reportId]);

        if (expenses && expenses.length > 0) {
            for (const exp of expenses) {
                await client.query(`
                    INSERT INTO dse_expenses (report_id, expense_type, description, amount)
                    VALUES ($1, $2, $3, $4)
                `, [reportId, exp.type || 'Other', exp.description, exp.amount]);
            }
        }

        // 5. Insert Denominations
        // Clear old denoms first
        await client.query('DELETE FROM cash_denominations WHERE report_id = $1', [reportId]);

        if (denominations && denominations.length > 0) {
            for (const denom of denominations) {
                await client.query(`
                    INSERT INTO cash_denominations (report_id, note_value, count)
                    VALUES ($1, $2, $3)
                `, [reportId, denom.value, denom.count]);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'EOD Sync Successful', report_id: reportId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("EOD Sync Failed:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// GET /api/dse/reports/:dse_id/:date - Fetch Report Status
router.get('/reports/:dse_id/:date', async (req, res) => {
    try {
        const { dse_id, date } = req.params;
        const result = await pool.query(`
            SELECT * FROM daily_sales_reports 
            WHERE dse_id = $1 AND report_date = $2
        `, [dse_id, date]);

        if (result.rows.length === 0) return res.json({ status: 'Not Synced' });
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/dse/dashboard - Daily Real-time Stats
router.get('/dashboard', async (req, res) => {
    try {
        const { dse_id, date } = req.query; // date in YYYY-MM-DD

        // 1. Sales Achieved Today (Confirmed Orders)
        const salesRes = await pool.query(`
            SELECT coalesce(SUM(grand_total), 0) as total_sales, COUNT(*) as order_count
            FROM sales_orders 
            WHERE created_by = $1 AND order_date = $2 AND status != 'Cancelled'
        `, [dse_id, date]);

        // 2. Collections Today
        const collectRes = await pool.query(`
            SELECT coalesce(SUM(amount), 0) as total_collection
            FROM customer_payments
            WHERE created_by = $1 AND payment_date = $2 OR (created_at::date = $2 AND created_by = $1)
        `, [dse_id, date]);

        // 3. Lines Sold (Productivity)
        const linesRes = await pool.query(`
            SELECT COUNT(*) as lines_sold
            FROM sales_order_lines sol
            JOIN sales_orders so ON sol.sales_order_id = so.id
            WHERE so.created_by = $1 AND so.order_date = $2
        `, [dse_id, date]);

        res.json({
            sales: salesRes.rows[0].total_sales,
            orders: salesRes.rows[0].order_count,
            collection: collectRes.rows[0].total_collection,
            lines: linesRes.rows[0].lines_sold
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
