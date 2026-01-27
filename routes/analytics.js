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

module.exports = router;
