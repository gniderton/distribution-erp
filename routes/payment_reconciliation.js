const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// 1. List Pending DSE Reports (Dashboard)
router.get('/list', async (req, res) => {
    try {
        const { date } = req.query;
        let query = `
            SELECT 
                dsr.id as report_id,
                dsr.report_date,
                e.full_name as dse_name,
                dsr.settlement_status,
                (COALESCE(dsr.total_collection_cash, 0) + COALESCE(dsr.total_collection_cheque, 0) + COALESCE(dsr.total_collection_online, 0)) as total_payment_collection,
                (SELECT COUNT(*) FROM customer_payments cp WHERE cp.collected_by = dsr.dse_id AND cp.payment_date = dsr.report_date AND cp.verification_status = 'Pending') as pending_count
            FROM daily_sales_reports dsr
            JOIN employees e ON dsr.dse_id = e.id
            WHERE dsr.settlement_status = 'Pending'
        `;

        const params = [];
        if (date) {
            query += ` AND dsr.report_date = $1`;
            params.push(date);
        }

        query += ` ORDER BY dsr.report_date DESC, e.full_name ASC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Get Report Details (Screen 2)
router.get('/:id/details', async (req, res) => {
    const { id } = req.params;
    try {
        // A. Summary
        const summaryRes = await pool.query(`
            SELECT dsr.*, e.full_name as dse_name 
            FROM daily_sales_reports dsr 
            JOIN employees e ON dsr.dse_id = e.id 
            WHERE dsr.id = $1
        `, [id]);

        if (summaryRes.rows.length === 0) return res.status(404).json({ error: "Report not found" });
        const summary = summaryRes.rows[0];

        // B. Payments (Grouped by Mode)
        const paymentsRes = await pool.query(`
            SELECT 
                cp.id, cp.customer_id, c.customer_name,
                cp.payment_date, cp.amount, cp.payment_mode,
                cp.transaction_ref as cheque_number, cp.cheque_date, cp.bank_name,
                cp.transaction_ref as transaction_reference, -- UTR for Online
                cp.verification_status, cp.rejection_reason
            FROM customer_payments cp
            JOIN customers c ON cp.customer_id = c.id
            WHERE cp.collected_by = $1 AND cp.payment_date = $2
            ORDER BY cp.created_at ASC
        `, [summary.dse_id, summary.report_date]);

        // C. Cash Denominations
        const denomsRes = await pool.query(`
            SELECT * FROM cash_denominations WHERE dse_id = $1 AND report_date = $2
        `, [summary.dse_id, summary.report_date]);

        res.json({
            summary,
            payments: paymentsRes.rows,
            denominations: denomsRes.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Verify/Reject Single Payment (Cheque/Online)
router.post('/payments/:id/verify', async (req, res) => {
    const { id } = req.params; // payment_id
    const { action, reason, user_id } = req.body; // action: 'Verify' | 'Reject'

    if (!['Verified', 'Rejected'].includes(action)) {
        return res.status(400).json({ error: "Invalid action. Use Verified or Rejected." });
    }

    if (action === 'Rejected' && !reason) {
        return res.status(400).json({ error: "Reason is required for rejection." });
    }

    try {
        const result = await pool.query(`
            UPDATE customer_payments 
            SET verification_status = $1, 
                rejection_reason = $2,
                verified_by = $3,
                verified_at = NOW()
            WHERE id = $4
            RETURNING id, verification_status
        `, [action, reason || null, user_id, id]);

        if (result.rows.length === 0) return res.status(404).json({ error: "Payment not found" });

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Finalize Day (Settlement)
router.post('/:id/finalize', async (req, res) => {
    const { id } = req.params; // report_id
    const { finance_remark, user_id } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if all declared payments (except Rejected) are Verified
        // Actually, we need to check if ANY 'Pending' payments exist for this DSE/Date
        const summaryRes = await client.query('SELECT dse_id, report_date FROM daily_sales_reports WHERE id = $1', [id]);
        if (summaryRes.rows.length === 0) throw new Error("Report not found");
        const { dse_id, report_date } = summaryRes.rows[0];

        const pendingCheck = await client.query(`
            SELECT COUNT(*) as count FROM customer_payments 
            WHERE collected_by = $1 AND payment_date = $2 AND verification_status = 'Pending'
        `, [dse_id, report_date]);

        if (parseInt(pendingCheck.rows[0].count) > 0) {
            throw new Error("Cannot finalize. Some payments are still Pending verification.");
        }

        // Lock Report
        await client.query(`
            UPDATE daily_sales_reports 
            SET settlement_status = 'Settled', 
                finance_remark = $1,
                updated_at = NOW()
            WHERE id = $2
        `, [finance_remark, id]);

        // TODO: Post to General Ledger (Phase 45/Future integration)
        // Insert into journal_entries... 

        await client.query('COMMIT');
        res.json({ success: true, message: "Day Finalized Successfully" });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// [NEW] 5. Reject Entire Cash Bundle
router.post('/:id/reject-cash', async (req, res) => {
    const { id } = req.params; // report_id
    const { reason, user_id } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get DSE info
        const summaryRes = await client.query('SELECT dse_id, report_date FROM daily_sales_reports WHERE id = $1', [id]);
        if (summaryRes.rows.length === 0) throw new Error("Report not found");
        const { dse_id, report_date } = summaryRes.rows[0];

        // Reject all CASH payments for this day
        // Wait, 'CASH' payments are individual rows in customer_payments too?
        // Yes, if they are invoice-wise.

        await client.query(`
            UPDATE customer_payments
            SET verification_status = 'Rejected',
                rejection_reason = $1,
                verified_by = $2,
                verified_at = NOW()
            WHERE collected_by = $3 AND payment_date = $4 AND payment_mode = 'Cash' AND verification_status = 'Pending'
        `, [reason, user_id, dse_id, report_date]);

        await client.query('COMMIT');
        res.json({ success: true, message: "All Cash payments for this day rejected." });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
