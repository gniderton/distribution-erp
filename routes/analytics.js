const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// --- DASHBOARD SUMMARY ---
router.get('/dashboard/summary', async (req, res) => {
    try {
        // 1. Total Sales (Last 30 Days)
        const salesRes = await pool.query(`
            SELECT coalesce(SUM(grand_total), 0) as total_sales 
            FROM sales_invoices 
            WHERE invoice_date >= CURRENT_DATE - INTERVAL '30 days' AND status != 'Cancelled'
        `);

        // 2. Total Outstanding (Sum of grand_total - payments)
        // Note: Faster to use ledger view or sum invoices - sum verified payments
        const outstandingRes = await pool.query(`
            SELECT coalesce(SUM(grand_total), 0) as total_invoiced 
            FROM sales_invoices 
            WHERE status != 'Cancelled'
        `);
        const collectionRes = await pool.query(`
            SELECT coalesce(SUM(amount), 0) as total_collected 
            FROM customer_payments 
            WHERE status = 'Verified'
        `);

        const totalOutstanding = Number(outstandingRes.rows[0].total_invoiced) - Number(collectionRes.rows[0].total_collected);

        // 3. Pending Verification (Orders & Payments)
        const pendingOrders = await pool.query("SELECT COUNT(*) FROM sales_orders WHERE status = 'Confirmed'");
        const pendingPayments = await pool.query("SELECT COUNT(*) FROM customer_payments WHERE status = 'Pending'");

        res.json({
            sales_30d: salesRes.rows[0].total_sales,
            total_outstanding: totalOutstanding,
            pending_orders: pendingOrders.rows[0].count,
            pending_payments: pendingPayments.rows[0].count
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PRODUCT PERFORMANCE ---
router.get('/products/velocity', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.product_name, 
                p.product_code,
                SUM(sol.ordered_qty) as total_sold,
                COUNT(distinct si.id) as order_count,
                (SELECT SUM(quantity_remaining) FROM inventory_batches WHERE product_id = p.id) as stock_on_hand
            FROM products p
            JOIN sales_order_lines sol ON p.id = sol.product_id
            JOIN sales_invoices si ON sol.sales_order_id = si.sales_order_id
            WHERE si.invoice_date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY p.id, p.product_name, p.product_code
            ORDER BY total_sold DESC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- DSE EFFICIENCY ---
router.get('/dse/performance', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                e.full_name as dse_name,
                (SELECT COUNT(*) FROM customer_visits WHERE dse_id = e.id AND visit_date >= CURRENT_DATE - INTERVAL '30 days') as visit_count,
                (SELECT COUNT(*) FROM sales_orders WHERE created_by = e.id AND order_date >= CURRENT_DATE - INTERVAL '30 days') as order_count,
                (SELECT coalesce(SUM(grand_total), 0) FROM sales_invoices si JOIN sales_orders so ON si.sales_order_id = so.id WHERE so.created_by = e.id AND si.invoice_date >= CURRENT_DATE - INTERVAL '30 days') as total_revenue
            FROM employees e
            WHERE e.id IN (SELECT dse_id FROM customers WHERE dse_id IS NOT NULL)
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CUSTOMER DASHBOARD ANALYTICS ---
router.get('/customers/:id/dashboard', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Sales & Rank
        const salesStats = await pool.query(`
            WITH SalesStats AS (
                SELECT customer_id, SUM(grand_total) as total_sales
                FROM sales_invoices
                WHERE status != 'Cancelled'
                GROUP BY customer_id
            ),
            RankedStats AS (
                SELECT customer_id, total_sales,
                RANK() OVER (ORDER BY total_sales DESC) as sales_rank,
                COUNT(*) OVER () as total_customers
                FROM SalesStats
            )
            SELECT total_sales, sales_rank, total_customers 
            FROM RankedStats WHERE customer_id = $1
        `, [id]);

        const s = salesStats.rows[0] || { total_sales: 0, sales_rank: 0, total_customers: 0 };

        // 2. Customer Info & Balance (Calculated)
        const custRes = await pool.query(`
            SELECT 
                c.customer_name, 
                c.credit_limit, 
                c.credit_days,
                (
                    SELECT COALESCE(SUM(grand_total), 0) 
                    FROM sales_invoices 
                    WHERE customer_id = c.id AND status != 'Cancelled'
                ) - (
                    SELECT COALESCE(SUM(amount), 0) 
                    FROM customer_payments 
                    WHERE customer_id = c.id AND status = 'Verified'
                ) as current_balance
            FROM customers c 
            WHERE c.id = $1
        `, [id]);
        
        const c = custRes.rows[0];

        // 3. Avg Credit Days (Time to close the bill)
        // Note: For cheques, we use clearance_date if available
        // Subtracting two dates in PG returns integer days directly.
        const creditRes = await pool.query(`
            SELECT COALESCE(AVG(COALESCE(chq.clearance_date, p.payment_date) - sih.invoice_date), 0) as avg_days
            FROM customer_payment_allocations cpa
            JOIN sales_invoices sih ON cpa.invoice_id = sih.id
            JOIN customer_payments p ON cpa.payment_id = p.id
            LEFT JOIN cheques chq ON chq.reference_id = p.id AND chq.reference_type = 'CUSTOMER_PAYMENT'
            WHERE sih.customer_id = $1 AND sih.status = 'Paid'
        `, [id]);

        // 4. Last Activity (Recent 5 Transactions)
        const recentRes = await pool.query(`
            SELECT type, reference_number, date, debit_amount, credit_amount, status
            FROM view_customer_ledger
            WHERE customer_id = $1
            ORDER BY date DESC, id DESC
            LIMIT 5
        `, [id]);

        res.json({
            metrics: {
                total_sales: parseFloat(s.total_sales),
                sales_rank: parseInt(s.sales_rank),
                total_customers_count: parseInt(s.total_customers),
                current_balance: parseFloat(c.current_balance || 0),
                credit_limit: parseFloat(c.credit_limit || 0),
                avg_credit_days: Math.round(parseFloat(creditRes.rows[0].avg_days || 0)),
                limit_utilization: c.credit_limit > 0 ? (parseFloat(c.current_balance || 0) / parseFloat(c.credit_limit) * 100).toFixed(1) : 0,
                receivables_vs_sales_ratio: s.total_sales > 0 ? parseFloat((parseFloat(c.current_balance || 0) / parseFloat(s.total_sales)).toFixed(4)) : 0
            },
            recent_activity: recentRes.rows
        });

    } catch (err) {
        console.error('Customer dashboard error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
