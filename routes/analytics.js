const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const XLSX = require('xlsx');

// --- DASHBOARD SUMMARY ---
router.get('/products/:id/profile', async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(id)) return res.status(400).json({ error: "Invalid Product ID" });

        // 1. Basic Product Info & Inventory Summary
        const productInfo = await pool.query(`
            SELECT p.*, b.brand_name, cat.category_name, t.tax_percentage,
                   COALESCE((SELECT SUM(quantity_remaining) FROM inventory_batches WHERE product_id = p.id AND is_active = true), 0) as total_stock,
                   COALESCE((SELECT COUNT(*) FROM inventory_batches WHERE product_id = p.id AND quantity_remaining > 0), 0) as batch_count
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.id
            LEFT JOIN categories cat ON p.category_id = cat.id
            LEFT JOIN taxes t ON p.tax_id = t.id
            WHERE p.id = $1
        `, [id]);

        if (productInfo.rows.length === 0) return res.status(404).json({ error: "Product not found" });

        // 2. Recent Purchase History
        const purchaseHistory = await pool.query(`
            SELECT pih.vendor_invoice_date as invoice_date, v.vendor_name, pil.accepted_qty as qty, pil.rate
            FROM purchase_invoice_lines pil
            JOIN purchase_invoice_headers pih ON pil.purchase_invoice_header_id = pih.id
            JOIN vendors v ON pih.vendor_id = v.id
            WHERE pil.product_id = $1
            ORDER BY pih.vendor_invoice_date DESC
            LIMIT 10
        `, [id]);

        // 3. Recent Sales History
        const salesHistory = await pool.query(`
            SELECT si.invoice_date, c.customer_name, sil.shipped_qty as qty, sil.rate
            FROM sales_invoice_lines sil
            JOIN sales_invoices si ON sil.invoice_id = si.id
            JOIN customers c ON si.customer_id = c.id
            WHERE sil.product_id = $1 AND si.status != 'Cancelled'
            ORDER BY si.invoice_date DESC
            LIMIT 10
        `, [id]);

        // 4. Return History
        const returnHistory = await pool.query(`
            SELECT sr.return_date, c.customer_name, srl.qty, srl.reason
            FROM sales_return_lines srl
            JOIN sales_returns sr ON srl.return_id = sr.id
            JOIN customers c ON sr.customer_id = c.id
            WHERE srl.product_id = $1 AND sr.status = 'Applied'
            ORDER BY sr.return_date DESC
            LIMIT 10
        `, [id]);

        // 5. Margin & Performance Analytics (Current & Previous Month)
        const performance = await pool.query(`
            WITH current_month AS (
                SELECT 
                    COALESCE(SUM(sil.shipped_qty), 0) as qty,
                    COALESCE(SUM(sil.taxable_amount), 0) as taxable,
                    COALESCE(AVG(sil.rate), 0) as avg_rate,
                    COALESCE(MAX(sil.rate), 0) as max_rate,
                    COALESCE(MIN(sil.rate), 0) as min_rate,
                    MAX(si.invoice_date) as last_sale_date
                FROM sales_invoice_lines sil
                JOIN sales_invoices si ON sil.invoice_id = si.id
                WHERE sil.product_id = $1 
                  AND si.invoice_date >= date_trunc('month', CURRENT_DATE)
                  AND si.status != 'Cancelled'
            ),
            prev_month AS (
                SELECT 
                    COALESCE(SUM(sil.shipped_qty), 0) as qty
                FROM sales_invoice_lines sil
                JOIN sales_invoices si ON sil.invoice_id = si.id
                WHERE sil.product_id = $1 
                  AND si.invoice_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                  AND si.invoice_date < date_trunc('month', CURRENT_DATE)
                  AND si.status != 'Cancelled'
            ),
            returns_agg AS (
                SELECT COALESCE(SUM(qty), 0) as return_qty
                FROM sales_return_lines srl
                JOIN sales_returns sr ON srl.return_id = sr.id
                WHERE srl.product_id = $1 AND sr.status = 'Applied'
                  AND sr.return_date >= date_trunc('month', CURRENT_DATE)
            )
            SELECT c.*, p.qty as prev_month_qty, r.return_qty
            FROM current_month c, prev_month p, returns_agg r
        `, [id]);

        // 6. Top Customers for this Product
        const topCustomers = await pool.query(`
            SELECT c.customer_name, SUM(sil.shipped_qty) as total_qty, SUM(sil.taxable_amount) as total_value
            FROM sales_invoice_lines sil
            JOIN sales_invoices si ON sil.invoice_id = si.id
            JOIN customers c ON si.customer_id = c.id
            WHERE sil.product_id = $1 AND si.status != 'Cancelled'
            GROUP BY c.id, c.customer_name
            ORDER BY total_qty DESC
            LIMIT 5
        `, [id]);

        // 7. Monthly Sales Trend (Last 6 Months)
        const trend = await pool.query(`
            SELECT TO_CHAR(si.invoice_date, 'Mon YYYY') as month, SUM(sil.shipped_qty) as qty
            FROM sales_invoice_lines sil
            JOIN sales_invoices si ON sil.invoice_id = si.id
            WHERE sil.product_id = $1 AND si.status != 'Cancelled'
              AND si.invoice_date >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY date_trunc('month', si.invoice_date), TO_CHAR(si.invoice_date, 'Mon YYYY')
            ORDER BY date_trunc('month', si.invoice_date) ASC
        `, [id]);

        // 8. Batch Breakdown & Valuation
        const batches = await pool.query(`
            SELECT 
                batch_code, quantity_remaining, purchase_rate, mrp, expiry_date, status,
                (quantity_remaining * purchase_rate) as batch_value,
                CASE WHEN expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN true ELSE false END as is_near_expiry
            FROM inventory_batches
            WHERE product_id = $1 AND quantity_remaining > 0
            ORDER BY expiry_date ASC
        `, [id]);

        const cur = performance.rows[0];
        const avgSalesRate = parseFloat(cur.avg_rate || 0);
        const avgPurchaseRate = parseFloat(productInfo.rows[0].purchase_rate || 0);
        
        // Advanced Calcs
        const totalStock = parseFloat(productInfo.rows[0].total_stock || 0);
        const monthlyQty = parseFloat(cur.qty || 0);
        const dailyBurnRate = monthlyQty / 30;
        const weeksOfCover = dailyBurnRate > 0 ? (totalStock / dailyBurnRate / 7).toFixed(1) : '99+';
        
        const momGrowth = cur.prev_month_qty > 0 ? (((cur.qty - cur.prev_month_qty) / cur.prev_month_qty) * 100).toFixed(1) : 0;
        const returnRate = cur.qty > 0 ? ((cur.return_qty / cur.qty) * 100).toFixed(1) : 0;
        
        const totalValuation = batches.rows.reduce((acc, b) => acc + parseFloat(b.batch_value), 0);
        const nearExpiryQty = batches.rows.filter(b => b.is_near_expiry).reduce((acc, b) => acc + parseFloat(b.quantity_remaining), 0);

        const lastSaleDate = cur.last_sale_date ? new Date(cur.last_sale_date) : null;
        const daysSinceLastSale = lastSaleDate ? Math.floor((new Date() - lastSaleDate) / (1000 * 60 * 60 * 24)) : 'N/A';

        res.json({
            product: productInfo.rows[0],
            analytics: {
                monthly_qty: monthlyQty,
                monthly_value: parseFloat(cur.taxable),
                avg_sales_rate: avgSalesRate.toFixed(2),
                avg_purchase_rate: avgPurchaseRate.toFixed(2),
                margin_pct: avgSalesRate > 0 ? (((avgSalesRate - avgPurchaseRate) / avgSalesRate) * 100).toFixed(2) : 0,
                price_range: { max: parseFloat(cur.max_rate), min: parseFloat(cur.min_rate) },
                growth: { mom_pct: momGrowth },
                return_rate_pct: returnRate,
                days_since_last_sale: daysSinceLastSale,
                trend: trend.rows,
                top_customers: topCustomers.rows
            },
            inventory: {
                total_stock: totalStock,
                weeks_of_cover: weeksOfCover,
                valuation: totalValuation.toFixed(2),
                near_expiry_qty: nearExpiryQty,
                batch_count: parseInt(productInfo.rows[0].batch_count),
                batches: batches.rows
            },
            history: {
                purchases: purchaseHistory.rows,
                sales: salesHistory.rows,
                returns: returnHistory.rows
            }
        });

    } catch (err) {
        console.error('Product profile error:', err);
        res.status(500).json({ error: err.message });
    }
});

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
        const outstandingRes = await pool.query(`
            SELECT coalesce(SUM(grand_total), 0) as total_invoiced 
            FROM sales_invoices 
            WHERE status != 'Cancelled'
        `);
        const collectionRes = await pool.query(`
            SELECT coalesce(SUM(amount), 0) as total_collected 
            FROM customer_payments 
            WHERE verification_status = 'Verified'
        `);

        const totalOutstanding = Number(outstandingRes.rows[0].total_invoiced) - Number(collectionRes.rows[0].total_collected);

        // 3. Pending Verification (Orders & Payments)
        const pendingOrders = await pool.query("SELECT COUNT(*) FROM sales_orders WHERE status = 'Confirmed'");
        const pendingPayments = await pool.query("SELECT COUNT(*) FROM customer_payments WHERE verification_status = 'Pending'");

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

        const summaryRes = await pool.query(`
            WITH CustomerTotals AS (
                SELECT 
                    customer_id, 
                    SUM(debit_amount) as gross_sales,
                    SUM(debit_amount - credit_amount) as balance
                FROM view_customer_ledger
                GROUP BY customer_id
            ),
            RankedStats AS (
                SELECT 
                    customer_id, 
                    gross_sales, 
                    balance,
                    RANK() OVER (ORDER BY gross_sales DESC) as sales_rank,
                    COUNT(*) OVER () as total_customers
                FROM CustomerTotals
            )
            SELECT gross_sales, balance, sales_rank, total_customers 
            FROM RankedStats WHERE customer_id = $1
        `, [id]);

        const s = summaryRes.rows[0] || { gross_sales: 0, balance: 0, sales_rank: 0, total_customers: 0 };

        const custRes = await pool.query(`
            SELECT customer_name, credit_limit, credit_days 
            FROM customers WHERE id = $1
        `, [id]);
        
        const c = custRes.rows[0];

        const creditRes = await pool.query(`
            SELECT COALESCE(AVG(COALESCE(chq.clearance_date, p.payment_date) - sih.invoice_date), 0) as avg_days
            FROM customer_payment_allocations cpa
            JOIN sales_invoices sih ON cpa.invoice_id = sih.id
            JOIN customer_payments p ON cpa.payment_id = p.id
            LEFT JOIN cheques chq ON chq.reference_id = p.id AND chq.reference_type = 'CUSTOMER_PAYMENT'
            WHERE sih.customer_id = $1 AND sih.status = 'Paid'
        `, [id]);

        const recentRes = await pool.query(`
            SELECT type, reference_number, date, debit_amount, credit_amount, status
            FROM view_customer_ledger
            WHERE customer_id = $1
            ORDER BY date DESC, id DESC
            LIMIT 10
        `, [id]);

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        let fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
        const fyStart = `${fyStartYear}-04-01`;

        const brandSalesRes = await pool.query(`
            SELECT 
                b.brand_name,
                COALESCE(SUM(sil.rate * sil.shipped_qty), 0) as taxable_sales
            FROM sales_invoice_lines sil
            JOIN sales_invoices si ON sil.invoice_id = si.id
            JOIN products p ON sil.product_id = p.id
            JOIN brands b ON p.brand_id = b.id
            WHERE si.customer_id = $1 AND si.invoice_date >= $2 AND si.status != 'Cancelled'
            GROUP BY b.id, b.brand_name
            ORDER BY taxable_sales DESC
        `, [id, fyStart]);

        res.json({
            metrics: {
                total_sales: parseFloat(s.gross_sales),
                sales_rank: parseInt(s.sales_rank),
                total_customers_count: parseInt(s.total_customers),
                current_balance: parseFloat(s.balance || 0),
                credit_limit: parseFloat(c.credit_limit || 0),
                avg_credit_days: Math.round(parseFloat(creditRes.rows[0].avg_days || 0)),
                limit_utilization: c.credit_limit > 0 ? (parseFloat(s.balance || 0) / parseFloat(c.credit_limit) * 100).toFixed(1) : 0,
                receivables_vs_sales_ratio: s.gross_sales > 0 ? parseFloat((parseFloat(s.balance || 0) / parseFloat(s.gross_sales)).toFixed(4)) : 0
            },
            recent_activity: recentRes.rows,
            brand_sales_fy: brandSalesRes.rows
        });

    } catch (err) {
        console.error('Customer dashboard error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/employees/:id/dashboard', async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(id) || isNaN(parseInt(id))) {
            return res.status(400).json({ error: "Invalid Employee ID" });
        }

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        const monthStart = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
        
        // Previous Month Range
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthStart = `${prevMonthDate.getFullYear()}-${(prevMonthDate.getMonth() + 1).toString().padStart(2, '0')}-01`;
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

        let fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
        const fyStart = `${fyStartYear}-04-01`;

        const custRes = await pool.query('SELECT id FROM customers WHERE dse_id = $1', [id]);
        const customerIds = custRes.rows.map(r => r.id);

        if (customerIds.length === 0) {
            return res.json({ 
                message: "No customers assigned", 
                metrics: { month: {}, prev_month: {}, fy: {} },
                productivity: { active_customers: 0, new_customers: 0 },
                visit_efficiency: { total_visits: 0, conversion_rate: 0 }
            });
        }

        const getPeriodMetrics = async (startDate, endDate = null) => {
            const dateFilter = endDate ? 'invoice_date >= $2 AND invoice_date <= $4' : 'invoice_date >= $2';
            const params = endDate ? [customerIds, startDate, id, endDate] : [customerIds, startDate, id];
            
            const stats = await pool.query(`
                SELECT 
                    COALESCE(SUM(total_taxable), 0) as gross_sales,
                    (SELECT COALESCE(SUM(total_taxable), 0) FROM sales_returns WHERE customer_id = ANY($1) AND return_date >= $2 ${endDate ? 'AND return_date <= $4' : ''} AND status = 'Applied') as returns,
                    (SELECT COALESCE(SUM(amount), 0) FROM customer_payments WHERE collected_by = $3 AND payment_date >= $2 ${endDate ? 'AND payment_date <= $4' : ''} AND verification_status = 'Verified') as collection,
                    (SELECT COUNT(*) FROM sales_orders WHERE created_by = $3 AND order_date >= $2 ${endDate ? 'AND order_date <= $4' : ''} AND status != 'Cancelled') as order_count
                FROM sales_invoices 
                WHERE customer_id = ANY($1) AND ${dateFilter} AND status != 'Cancelled'
            `, params);

            const creditParams = endDate ? [customerIds, startDate, endDate] : [customerIds, startDate];
            const creditRes = await pool.query(`
                SELECT COALESCE(AVG(p.payment_date - sih.invoice_date), 0) as avg_days
                FROM customer_payment_allocations cpa
                JOIN sales_invoices sih ON cpa.invoice_id = sih.id
                JOIN customer_payments p ON cpa.payment_id = p.id
                WHERE sih.customer_id = ANY($1) AND sih.invoice_date >= $2 ${endDate ? 'AND sih.invoice_date <= $3' : ''} AND cpa.status = 'ACTIVE'
            `, creditParams);

            const s = stats.rows[0];
            return {
                gross_sales_taxable: parseFloat(s.gross_sales),
                returns_taxable: parseFloat(s.returns),
                net_sales_taxable: parseFloat(s.gross_sales) - parseFloat(s.returns),
                collection: parseFloat(s.collection),
                order_count: parseInt(s.order_count),
                avg_credit_days: Math.round(parseFloat(creditRes.rows[0].avg_days))
            };
        };

        const monthMetrics = await getPeriodMetrics(monthStart);
        const prevMonthMetrics = await getPeriodMetrics(prevMonthStart, prevMonthEnd);
        const fyMetrics = await getPeriodMetrics(fyStart);

        // Productivity & visits
        const productivityRes = await pool.query(`
            SELECT 
                (SELECT COUNT(DISTINCT customer_id) FROM sales_invoices WHERE customer_id = ANY($1) AND invoice_date >= $2 AND status != 'Cancelled') as active_customers,
                (SELECT COUNT(*) FROM customers WHERE dse_id = $3 AND created_at >= $2) as new_customers,
                (SELECT COUNT(*) FROM customer_visits WHERE dse_id = $3 AND visit_date >= $2) as total_visits
        `, [customerIds, monthStart, id]);

        const p = productivityRes.rows[0];
        const visitEfficiency = {
            total_visits: parseInt(p.total_visits),
            active_customers_covered: parseInt(p.active_customers),
            conversion_rate: p.total_visits > 0 ? ((monthMetrics.order_count / p.total_visits) * 100).toFixed(1) : 0,
            avg_order_value: monthMetrics.order_count > 0 ? (monthMetrics.gross_sales_taxable / monthMetrics.order_count).toFixed(2) : 0
        };

        const topCustomers = await pool.query(`
            SELECT c.customer_name, COALESCE(SUM(si.total_taxable), 0) as taxable_sales
            FROM customers c
            JOIN sales_invoices si ON c.id = si.customer_id
            WHERE c.dse_id = $1 AND si.invoice_date >= $2 AND si.status != 'Cancelled'
            GROUP BY c.id, c.customer_name
            ORDER BY taxable_sales DESC
            LIMIT 10
        `, [id, monthStart]);

        const brandSales = await pool.query(`
            SELECT b.brand_name, COALESCE(SUM(sil.rate * sil.shipped_qty), 0) as taxable_sales
            FROM sales_invoice_lines sil
            JOIN sales_invoices si ON sil.invoice_id = si.id
            JOIN products p ON sil.product_id = p.id
            JOIN brands b ON p.brand_id = b.id
            WHERE si.customer_id = ANY($1) AND si.invoice_date >= $2 AND si.status != 'Cancelled'
            GROUP BY b.id, b.brand_name
            ORDER BY taxable_sales DESC
        `, [customerIds, monthStart]);

        // [NEW] Top 10 Fast Moving Products
        const topProducts = await pool.query(`
            SELECT p.product_name, COALESCE(SUM(sil.rate * sil.shipped_qty), 0) as taxable_sales, SUM(sil.shipped_qty) as total_qty
            FROM sales_invoice_lines sil
            JOIN sales_invoices si ON sil.invoice_id = si.id
            JOIN products p ON sil.product_id = p.id
            WHERE si.customer_id = ANY($1) AND si.invoice_date >= $2 AND si.status != 'Cancelled'
            GROUP BY p.id, p.product_name
            ORDER BY taxable_sales DESC
            LIMIT 10
        `, [customerIds, monthStart]);

        // [NEW] Dormant Customers (Assigned but no orders in 30 days)
        const dormantCustomers = await pool.query(`
            SELECT c.id, c.customer_name
            FROM customers c
            WHERE c.dse_id = $1 AND c.id NOT IN (
                SELECT DISTINCT customer_id FROM sales_invoices 
                WHERE invoice_date >= CURRENT_DATE - INTERVAL '30 days' AND status != 'Cancelled'
            )
        `, [id]);

        // [NEW] Payment Mode Split
        const paymentSplit = await pool.query(`
            SELECT payment_mode, COALESCE(SUM(amount), 0) as total_amount
            FROM customer_payments
            WHERE collected_by = $1 AND payment_date >= $2 AND verification_status != 'Rejected'
            GROUP BY payment_mode
        `, [id, monthStart]);

        // [NEW] Return Reasons
        const returnReasons = await pool.query(`
            SELECT COALESCE(srl.reason, 'Not Specified') as reason, COALESCE(SUM(srl.taxable_amount), 0) as amount
            FROM sales_return_lines srl
            JOIN sales_returns sr ON srl.return_id = sr.id
            WHERE sr.customer_id = ANY($1) AND sr.return_date >= $2 AND sr.status = 'Applied'
            GROUP BY srl.reason
            ORDER BY amount DESC
        `, [customerIds, monthStart]);

        // [NEW] Route Performance
        const routePerformance = await pool.query(`
            SELECT r.route_name, COALESCE(SUM(si.total_taxable), 0) as taxable_sales
            FROM routes r
            JOIN customers c ON c.route_id = r.id
            JOIN sales_invoices si ON si.customer_id = c.id
            WHERE c.dse_id = $1 AND si.invoice_date >= $2 AND si.status != 'Cancelled'
            GROUP BY r.id, r.route_name
            ORDER BY taxable_sales DESC
        `, [id, monthStart]);

        // [NEW] Pending Orders Summary
        const pendingOrders = await pool.query(`
            SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_value
            FROM sales_orders
            WHERE created_by = $1 AND status = 'Pending'
        `, [id]);

        const categorySales = await pool.query(`
            SELECT cat.category_name, COALESCE(SUM(sil.rate * sil.shipped_qty), 0) as taxable_sales
            FROM sales_invoice_lines sil
            JOIN sales_invoices si ON sil.invoice_id = si.id
            JOIN products p ON sil.product_id = p.id
            JOIN categories cat ON p.category_id = cat.id
            WHERE si.customer_id = ANY($1) AND si.invoice_date >= $2 AND si.status != 'Cancelled'
            GROUP BY cat.id, cat.category_name
            ORDER BY taxable_sales DESC
        `, [customerIds, monthStart]);

        const ageingRes = await pool.query(`
            SELECT 
                CASE 
                    WHEN (CURRENT_DATE - invoice_date) <= 30 THEN '0-30 Days'
                    WHEN (CURRENT_DATE - invoice_date) <= 60 THEN '31-60 Days'
                    ELSE '61+ Days'
                END as bucket,
                COALESCE(SUM(grand_total - paid_amount), 0) as outstanding
            FROM sales_invoices
            WHERE customer_id = ANY($1) AND status != 'Paid' AND status != 'Cancelled'
            GROUP BY 1
        `, [customerIds]);

        const ageingMap = { '0-30 Days': 0, '31-60 Days': 0, '61+ Days': 0 };
        ageingRes.rows.forEach(r => ageingMap[r.bucket] = parseFloat(r.outstanding));

        // Focus Area: Top 5 Overdue Customers (Specific Focus)
        const overdueFocus = await pool.query(`
            SELECT c.customer_name, COALESCE(SUM(si.grand_total - si.paid_amount), 0) as overdue_amount,
                   MAX(CURRENT_DATE - si.invoice_date) as oldest_invoice_days
            FROM customers c
            JOIN sales_invoices si ON c.id = si.customer_id
            WHERE c.dse_id = $1 AND si.status != 'Paid' AND si.status != 'Cancelled'
              AND (CURRENT_DATE - si.invoice_date) > 30
            GROUP BY c.id, c.customer_name
            ORDER BY overdue_amount DESC
            LIMIT 5
        `, [id]);

        const targetRes = await pool.query(`
            SELECT t.*, p.name as plan_name,
                COALESCE((SELECT SUM(points) FROM performance_points_history WHERE employee_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3), 0) as total_points
            FROM employee_targets t
            JOIN incentive_plans p ON t.plan_id = p.id
            WHERE t.employee_id = $1 AND t.month = $2 AND t.year = $3
        `, [id, currentMonth, currentYear]);

        // Daily Trend (Last 30 Days)
        const dailyTrend = await pool.query(`
            WITH RECURSIVE days AS (
                SELECT CURRENT_DATE - INTERVAL '29 days' as day_date
                UNION ALL
                SELECT day_date + INTERVAL '1 day' FROM days WHERE day_date < CURRENT_DATE
            )
            SELECT 
                TO_CHAR(d.day_date, 'DD Mon') as label,
                COALESCE((SELECT SUM(total_taxable) FROM sales_invoices WHERE customer_id = ANY($1) AND invoice_date = d.day_date AND status != 'Cancelled'), 0) as sales,
                COALESCE((SELECT SUM(amount) FROM customer_payments WHERE collected_by = $2 AND payment_date = d.day_date AND verification_status = 'Verified'), 0) as collections,
                COALESCE((
                    SELECT SUM(vl.debit_amount - vl.credit_amount) 
                    FROM view_customer_ledger vl
                    JOIN customers c ON vl.customer_id = c.id
                    JOIN routes r ON c.route_id = r.id
                    WHERE c.dse_id = $2 
                      AND r.route_name ILIKE TRIM(TO_CHAR(d.day_date, 'Day'))
                      AND vl.date <= d.day_date
                ), 0) as route_receivables
            FROM days d
            ORDER BY d.day_date ASC
        `, [customerIds, id]);

        res.json({
            metrics: { 
                month: monthMetrics, 
                prev_month: prevMonthMetrics, 
                fy: fyMetrics,
                growth_sales_pct: prevMonthMetrics.net_sales_taxable > 0 ? (((monthMetrics.net_sales_taxable - prevMonthMetrics.net_sales_taxable) / prevMonthMetrics.net_sales_taxable) * 100).toFixed(1) : 0,
                growth_collection_pct: prevMonthMetrics.collection > 0 ? (((monthMetrics.collection - prevMonthMetrics.collection) / prevMonthMetrics.collection) * 100).toFixed(1) : 0
            },
            productivity: {
                active_customers: parseInt(p.active_customers),
                total_assigned_customers: customerIds.length,
                market_coverage_pct: ((parseInt(p.active_customers) / customerIds.length) * 100).toFixed(1),
                new_customers_this_month: parseInt(p.new_customers)
            },
            visit_efficiency: visitEfficiency,
            top_customers: topCustomers.rows,
            top_products: topProducts.rows,
            brand_sales: brandSales.rows,
            category_sales: categorySales.rows,
            ageing: ageingMap,
            overdue_focus: overdueFocus.rows,
            performance: targetRes.rows[0] || { total_points: 0, plan_name: 'No Plan Assigned' },
            daily_trend: dailyTrend.rows.map(r => ({
                ...r,
                sales: parseFloat(r.sales),
                collections: parseFloat(r.collections),
                route_receivables: parseFloat(r.route_receivables)
            })),
            dormant_customers: {
                count: dormantCustomers.rowCount,
                list: dormantCustomers.rows.slice(0, 10) // Limit list to top 10 dormant
            },
            payment_split: paymentSplit.rows,
            return_reasons: returnReasons.rows,
            route_performance: routePerformance.rows,
            pending_orders_summary: pendingOrders.rows[0]
        });

    } catch (err) {
        console.error('Employee dashboard error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- 3. CASH FLOW (GL-POWERED) ---
router.get('/reports/cash-flow', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const now = new Date();
        const fyStart = `${now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1}-04-01`;
        const sd = start_date || fyStart;
        const ed = end_date || now.toISOString().split('T')[0];

        const stats = await pool.query(`
            SELECT 
                (SELECT COALESCE(SUM(jl.debit), 0) FROM journal_lines jl JOIN journal_entries je ON jl.journal_entry_id = je.id JOIN chart_of_accounts coa ON jl.account_id = coa.id WHERE coa.type = 'ASSET' AND (coa.code = 1002 OR coa.code = 1003) AND je.transaction_date >= $1 AND je.transaction_date <= $2) as inflow,
                (SELECT COALESCE(SUM(jl.credit), 0) FROM journal_lines jl JOIN journal_entries je ON jl.journal_entry_id = je.id JOIN chart_of_accounts coa ON jl.account_id = coa.id WHERE coa.type = 'ASSET' AND (coa.code = 1002 OR coa.code = 1003) AND je.transaction_date >= $1 AND je.transaction_date <= $2) as outflow
        `, [sd, ed]);

        const inflow = parseFloat(stats.rows[0].inflow);
        const outflow = parseFloat(stats.rows[0].outflow);

        res.json({ period: { start: sd, end: ed }, summary: { total_inflow: inflow, total_outflow: outflow, net_cash_flow: inflow - outflow } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 2. PROFIT & LOSS (DETAILED GL-POWERED) ---
router.get('/reports/p-and-l', async (req, res) => {
    try {
        const { start_date, end_date, fy, quarter, month } = req.query;
        const now = new Date();
        
        let sd, ed;

        if (fy) {
            const startYear = parseInt(fy);
            // Default to whole FY
            sd = `${startYear}-04-01`;
            ed = `${startYear + 1}-03-31`;

            // Month takes precedence as it is the most specific
            if (month) {
                const m = parseInt(month); // 1 = Jan, 12 = Dec
                let calYear = (m >= 1 && m <= 3) ? startYear + 1 : startYear;
                sd = `${calYear}-${m.toString().padStart(2, '0')}-01`;
                ed = new Date(calYear, m, 0).toISOString().split('T')[0];
            } 
            else if (quarter) {
                const q = parseInt(quarter);
                if (q === 1) { sd = `${startYear}-04-01`; ed = `${startYear}-06-30`; }
                else if (q === 2) { sd = `${startYear}-07-01`; ed = `${startYear}-09-30`; }
                else if (q === 3) { sd = `${startYear}-10-01`; ed = `${startYear}-12-31`; }
                else if (q === 4) { sd = `${startYear + 1}-01-01`; ed = `${startYear + 1}-03-31`; }
            }
        }
 else {
            // Fallback to existing logic if no FY is provided
            const fyStartYear = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
            const fyStart = `${fyStartYear}-04-01`;
            sd = start_date || fyStart;
            ed = end_date || now.toISOString().split('T')[0];
        }

        // 1. Fetch Balances grouped by Account for INCOME and EXPENSE
        const balRes = await pool.query(`
            SELECT 
                coa.code,
                coa.name,
                coa.type,
                COALESCE(SUM(jl.credit - jl.debit), 0) as balance_income,
                COALESCE(SUM(jl.debit - jl.credit), 0) as balance_expense
            FROM journal_lines jl
            JOIN journal_entries je ON jl.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jl.account_id = coa.id
            WHERE coa.type IN ('INCOME', 'EXPENSE')
              AND je.transaction_date >= $1 AND je.transaction_date <= $2
            GROUP BY coa.id, coa.code, coa.name, coa.type
            ORDER BY coa.code ASC
        `, [sd, ed]);

        const rows = balRes.rows;

        // 2. Categorization Logic
        const sections = {
            revenue: { title: "Revenue", lines: [], total: 0 },
            cogs: { title: "Cost of Goods Sold (Direct)", lines: [], total: 0 },
            operating_expenses: { title: "Operating Expenses (Indirect)", lines: [], total: 0 },
            other_income: { title: "Other Income", lines: [], total: 0 }
        };

        rows.forEach(row => {
            const code = parseInt(row.code);
            const balance = row.type === 'INCOME' ? parseFloat(row.balance_income) : parseFloat(row.balance_expense);
            
            if (balance === 0) return; // Skip zero balances

            const lineItem = { code: row.code, name: row.name, amount: balance };

            if (row.type === 'INCOME') {
                if (code === 4001 || code === 4003) {
                    sections.revenue.lines.push(lineItem);
                    sections.revenue.total += balance;
                } else {
                    sections.other_income.lines.push(lineItem);
                    sections.other_income.total += balance;
                }
            } else if (row.type === 'EXPENSE') {
                if (code === 5001 || code === 5002) {
                    sections.cogs.lines.push(lineItem);
                    sections.cogs.total += balance;
                } else {
                    sections.operating_expenses.lines.push(lineItem);
                    sections.operating_expenses.total += balance;
                }
            }
        });

        const grossProfit = Number((sections.revenue.total - sections.cogs.total).toFixed(2));
        const netProfit = Number((grossProfit - sections.operating_expenses.total + sections.other_income.total).toFixed(2));

        // Final cleanup of section totals
        sections.revenue.total = Number(sections.revenue.total.toFixed(2));
        sections.cogs.total = Number(sections.cogs.total.toFixed(2));
        sections.operating_expenses.total = Number(sections.operating_expenses.total.toFixed(2));
        sections.other_income.total = Number(sections.other_income.total.toFixed(2));

        res.json({
            period: { start: sd, end: ed },
            sections,
            summary: {
                total_revenue: sections.revenue.total,
                total_cogs: sections.cogs.total,
                gross_profit: grossProfit,
                operating_expenses: sections.operating_expenses.total,
                other_income: sections.other_income.total,
                net_profit: netProfit,
                gross_margin: sections.revenue.total > 0 ? (grossProfit / sections.revenue.total * 100).toFixed(2) + '%' : '0%',
                net_margin: sections.revenue.total > 0 ? (netProfit / sections.revenue.total * 100).toFixed(2) + '%' : '0%'
            }
        });
    } catch (err) {
        console.error('P&L Report Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- 4. SALES FY REPORT (GL-POWERED) ---
router.get('/sales-fy-report', async (req, res) => {
    try {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const fyStartYear = currentMonth >= 4 ? now.getFullYear() : now.getFullYear() - 1;
        const fyStart = `${fyStartYear}-04-01`;
        const fyEnd = `${fyStartYear + 1}-03-31`;

        const monthlyStats = await pool.query(`
            WITH months AS (SELECT generate_series($1::date, LEAST($2::date, CURRENT_DATE), '1 month'::interval) as month_start)
            SELECT TO_CHAR(m.month_start, 'MMMM YYYY') as month_name,
                COALESCE((SELECT SUM(jl.credit - jl.debit) FROM journal_lines jl JOIN journal_entries je ON jl.journal_entry_id = je.id JOIN chart_of_accounts coa ON jl.account_id = coa.id WHERE coa.code = 4001 AND je.transaction_date >= m.month_start AND je.transaction_date < m.month_start + interval '1 month'), 0) as revenue,
                COALESCE((SELECT SUM(jl.debit) FROM journal_lines jl JOIN journal_entries je ON jl.journal_entry_id = je.id JOIN chart_of_accounts coa ON jl.account_id = coa.id WHERE (coa.type = 'ASSET' AND (coa.code = 1002 OR coa.code = 1003)) AND je.reference_type = 'CUST_PAY' AND je.transaction_date >= m.month_start AND je.transaction_date < m.month_start + interval '1 month'), 0) as collected
            FROM months m ORDER BY m.month_start ASC
        `, [fyStart, fyEnd]);

        const receivablesRes = await pool.query(`SELECT SUM(jl.debit - jl.credit) as balance FROM journal_lines jl JOIN chart_of_accounts coa ON jl.account_id = coa.id WHERE coa.code = 1101`);

        res.json({ fy_start: fyStart, total_outstanding_receivables: parseFloat(receivablesRes.rows[0].balance || 0), monthly_data: monthlyStats.rows.map(r => ({ month_name: r.month_name.trim(), revenue: parseFloat(r.revenue), collected: parseFloat(r.collected), receivables: parseFloat(r.revenue) - parseFloat(r.collected) })) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 6. OPERATING BALANCES (GL-POWERED BANK SPLIT) ---
router.get('/reports/fy-operating-balances', async (req, res) => {
    try {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const fyStartYear = currentMonth >= 4 ? now.getFullYear() : now.getFullYear() - 1;
        const fyStart = `${fyStartYear}-04-01`;

        const accountsRes = await pool.query(`SELECT id, bank_name, account_number FROM bank_accounts WHERE is_active = true`);
        const accounts = accountsRes.rows;

        const details = await Promise.all(accounts.map(async (acc) => {
            const stats = await pool.query(`
                SELECT COALESCE(SUM(jl.debit), 0) as inflow, COALESCE(SUM(jl.credit), 0) as outflow
                FROM journal_lines jl JOIN journal_entries je ON jl.journal_entry_id = je.id
                WHERE jl.bank_account_id = $1 AND je.transaction_date >= $2
            `, [acc.id, fyStart]);
            const row = stats.rows[0];
            return { id: acc.id, name: acc.bank_name, account_number: acc.account_number, inflow: parseFloat(row.inflow), outflow: parseFloat(row.outflow), net_movement: parseFloat(row.inflow) - parseFloat(row.outflow) };
        }));

        const chequesRes = await pool.query(`SELECT SUM(jl.debit - jl.credit) as balance FROM journal_lines jl JOIN chart_of_accounts coa ON jl.account_id = coa.id WHERE coa.code = 1004`);


        res.json({ fy_start: fyStart, accounts: details, cheques_in_hand: parseFloat(chequesRes.rows[0].balance || 0), total_operating_liquidity: details.reduce((sum, d) => sum + d.net_movement, 0) + parseFloat(chequesRes.rows[0].balance || 0) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 7. SALES LINE REPORT (DETAILED) ---
router.get('/reports/sales-lines', async (req, res) => {
    try {
        const { start_date, end_date, customer_id, product_id, limit = 50, offset = 0 } = req.query;
        
        // Helper: Convert DD/MM/YYYY to YYYY-MM-DD if needed
        const normalizeDate = (d) => {
            if (!d) return null;
            if (typeof d === 'string' && d.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const [day, month, year] = d.split('/');
                return `${year}-${month}-${day}`;
            }
            return d;
        };

        const now = new Date();
        const fyStart = `${now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1}-04-01`;
        
        const sd = normalizeDate(start_date) || fyStart;
        const ed = normalizeDate(end_date) || now.toISOString().split('T')[0];

        let baseQuery = `
            FROM sales_invoice_lines sil
            JOIN sales_invoices si ON sil.invoice_id = si.id
            JOIN products p ON sil.product_id = p.id
            JOIN customers c ON si.customer_id = c.id
            JOIN brands b ON p.brand_id = b.id
            JOIN categories cat ON p.category_id = cat.id
            LEFT JOIN employees dse ON c.dse_id = dse.id
            LEFT JOIN routes r ON c.route_id = r.id
            WHERE si.invoice_date >= $1 AND si.invoice_date <= $2
              AND si.status != 'Cancelled'
        `;

        const params = [sd, ed];
        if (customer_id) {
            params.push(customer_id);
            baseQuery += ` AND si.customer_id = $${params.length}`;
        }
        if (product_id) {
            params.push(product_id);
            baseQuery += ` AND sil.product_id = $${params.length}`;
        }

        // 1. Get Summary Stats (Taxable, Tax, Count) for the entire filtered period
        const summaryRes = await pool.query(`
            SELECT 
                COUNT(*) as total_lines,
                COALESCE(SUM(sil.taxable_amount), 0) as total_taxable,
                COALESCE(SUM(sil.tax_amount), 0) as total_tax,
                COALESCE(SUM(sil.amount), 0) as total_grand
            ${baseQuery}
        `, params);
        
        const summary = {
            total_lines: parseInt(summaryRes.rows[0].total_lines),
            total_taxable: parseFloat(summaryRes.rows[0].total_taxable),
            total_tax: parseFloat(summaryRes.rows[0].total_tax),
            total_grand: parseFloat(summaryRes.rows[0].total_grand)
        };

        // 2. Get Data with Pagination
        let dataQuery = `
            SELECT 
                si.invoice_date as date,
                si.invoice_number as invoice_no,
                c.customer_name as customer,
                dse.full_name as dse_name,
                r.route_name as route_name,
                p.product_name as product,
                p.product_code as sku,
                b.brand_name as brand,
                cat.category_name as category,
                sil.shipped_qty as qty,
                sil.rate as unit_rate,
                sil.tax_amount as tax,
                sil.taxable_amount as taxable,
                sil.amount as total_amount,
                si.status
            ${baseQuery}
            ORDER BY si.invoice_date DESC, si.invoice_number DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        const dataParams = [...params, limit, offset];
        const result = await pool.query(dataQuery, dataParams);

        res.json({
            period: { start: sd, end: ed },
            summary: summary,
            pagination: {
                total_count: summary.total_lines,
                limit: parseInt(limit),
                offset: parseInt(offset)
            },
            count: result.rowCount,
            lines: result.rows.map(row => ({
                ...row,
                qty: parseFloat(row.qty),
                unit_rate: parseFloat(row.unit_rate),
                tax: parseFloat(row.tax),
                taxable: parseFloat(row.taxable),
                total_amount: parseFloat(row.total_amount)
            }))
        });
    } catch (err) {
        console.error('Sales Line Report Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- 8. SALES LINE EXPORT (EXCEL) ---
router.get('/reports/sales-lines/export', async (req, res) => {
    try {
        const { start_date, end_date, customer_id, product_id } = req.query;
        
        const normalizeDate = (d) => {
            if (!d) return null;
            if (typeof d === 'string' && d.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const [day, month, year] = d.split('/');
                return `${year}-${month}-${day}`;
            }
            return d;
        };

        const now = new Date();
        const fyStart = `${now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1}-04-01`;
        const sd = normalizeDate(start_date) || fyStart;
        const ed = normalizeDate(end_date) || now.toISOString().split('T')[0];

        let query = `
            SELECT 
                si.invoice_date as "Date",
                si.invoice_number as "Invoice No",
                c.customer_name as "Customer",
                dse.full_name as "DSE",
                r.route_name as "Route",
                p.product_name as "Product",
                p.product_code as "SKU",
                b.brand_name as "Brand",
                cat.category_name as "Category",
                sil.shipped_qty as "Qty",
                sil.rate as "Unit Rate",
                sil.tax_amount as "GST",
                sil.taxable_amount as "Taxable",
                sil.amount as "Total Amount",
                si.status as "Status"
            FROM sales_invoice_lines sil
            JOIN sales_invoices si ON sil.invoice_id = si.id
            JOIN products p ON sil.product_id = p.id
            JOIN customers c ON si.customer_id = c.id
            JOIN brands b ON p.brand_id = b.id
            JOIN categories cat ON p.category_id = cat.id
            LEFT JOIN employees dse ON c.dse_id = dse.id
            LEFT JOIN routes r ON c.route_id = r.id
            WHERE si.invoice_date >= $1 AND si.invoice_date <= $2
              AND si.status != 'Cancelled'
        `;

        const params = [sd, ed];
        if (customer_id) {
            params.push(customer_id);
            query += ` AND si.customer_id = $${params.length}`;
        }
        if (product_id) {
            params.push(product_id);
            query += ` AND sil.product_id = $${params.length}`;
        }

        query += ` ORDER BY si.invoice_date DESC, si.invoice_number DESC`;

        const result = await pool.query(query, params);

        // Convert data types for Excel
        const rows = result.rows.map(r => ({
            ...r,
            Date: new Date(r.Date).toLocaleDateString('en-IN'),
            Qty: parseFloat(r.Qty),
            "Unit Rate": parseFloat(r["Unit Rate"]),
            GST: parseFloat(r.GST),
            Taxable: parseFloat(r.Taxable),
            "Total Amount": parseFloat(r["Total Amount"])
        }));

        // Create Workbook
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Lines");

        // Generate Buffer
        const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set Headers
        const filename = `Sales_Lines_${sd}_to_${ed}.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        
        res.send(buf);

    } catch (err) {
        console.error('Excel Export Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- 9. DETAILED SALES SUMMARY REPORT ---
router.get('/reports/sales-summary-detailed', async (req, res) => {
    try {
        const { start_date, end_date, customer_id, product_id, fy, month } = req.query;
        
        const normalizeDate = (d) => {
            if (!d) return null;
            if (typeof d === 'string' && d.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const [day, m, year] = d.split('/');
                return `${year}-${m}-${day}`;
            }
            return d;
        };

        const now = new Date();
        let sd, ed;

        if (fy) {
            const startYear = parseInt(fy);
            sd = `${startYear}-04-01`;
            ed = `${startYear + 1}-03-31`;

            if (month) {
                const m = parseInt(month);
                let calYear = startYear;
                if (m >= 1 && m <= 3) {
                    calYear = startYear + 1;
                }
                sd = `${calYear}-${m.toString().padStart(2, '0')}-01`;
                ed = new Date(calYear, m, 0).toISOString().split('T')[0];
            }
        } else {
            const fyStartYear = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
            const fyStart = `${fyStartYear}-04-01`;
            sd = normalizeDate(start_date) || fyStart;
            ed = normalizeDate(end_date) || now.toISOString().split('T')[0];
        }

        let baseQuery = `
            FROM sales_invoice_lines sil
            JOIN sales_invoices si ON sil.invoice_id = si.id
            JOIN products p ON sil.product_id = p.id
            JOIN customers c ON si.customer_id = c.id
            JOIN brands b ON p.brand_id = b.id
            JOIN categories cat ON p.category_id = cat.id
            LEFT JOIN employees dse ON c.dse_id = dse.id
            LEFT JOIN routes r ON c.route_id = r.id
            WHERE si.invoice_date >= $1 AND si.invoice_date <= $2
              AND si.status != 'Cancelled'
        `;

        const params = [sd, ed];
        if (customer_id) {
            params.push(customer_id);
            baseQuery += ` AND si.customer_id = $${params.length}`;
        }
        if (product_id) {
            params.push(product_id);
            baseQuery += ` AND sil.product_id = $${params.length}`;
        }

        // Summary queries
        const queries = [
            pool.query(`SELECT COUNT(*) as lines, SUM(sil.shipped_qty) as qty, SUM(sil.taxable_amount) as taxable, SUM(sil.tax_amount) as tax, SUM(sil.amount) as amount ${baseQuery}`, params),
            pool.query(`SELECT p.product_name, p.product_code, SUM(sil.shipped_qty) as qty, SUM(sil.taxable_amount) as taxable, SUM(sil.tax_amount) as tax, SUM(sil.amount) as amount ${baseQuery} GROUP BY p.id, p.product_name, p.product_code ORDER BY amount DESC LIMIT 10`, params),
            pool.query(`SELECT c.customer_name, SUM(sil.shipped_qty) as qty, SUM(sil.taxable_amount) as taxable, SUM(sil.tax_amount) as tax, SUM(sil.amount) as amount ${baseQuery} GROUP BY c.id, c.customer_name ORDER BY amount DESC LIMIT 10`, params),
            pool.query(`SELECT COALESCE(dse.full_name, 'Unassigned') as dse_name, SUM(sil.shipped_qty) as qty, SUM(sil.taxable_amount) as taxable, SUM(sil.tax_amount) as tax, SUM(sil.amount) as amount ${baseQuery} GROUP BY dse.id, dse.full_name ORDER BY amount DESC`, params),
            pool.query(`SELECT b.brand_name, SUM(sil.shipped_qty) as qty, SUM(sil.taxable_amount) as taxable, SUM(sil.tax_amount) as tax, SUM(sil.amount) as amount ${baseQuery} GROUP BY b.id, b.brand_name ORDER BY amount DESC`, params),
            pool.query(`SELECT cat.category_name, SUM(sil.shipped_qty) as qty, SUM(sil.taxable_amount) as taxable, SUM(sil.tax_amount) as tax, SUM(sil.amount) as amount ${baseQuery} GROUP BY cat.id, cat.category_name ORDER BY amount DESC`, params),
            pool.query(`SELECT COALESCE(r.route_name, 'Unassigned') as route_name, SUM(sil.shipped_qty) as qty, SUM(sil.taxable_amount) as taxable, SUM(sil.tax_amount) as tax, SUM(sil.amount) as amount ${baseQuery} GROUP BY r.id, r.route_name ORDER BY amount DESC`, params)
        ];

        const [overall, products, customers, dses, brands, categories, routes] = await Promise.all(queries);

        const formatData = (rows) => rows.map(r => ({
            ...r,
            qty: parseFloat(r.qty || 0),
            taxable: parseFloat(r.taxable || 0),
            tax: parseFloat(r.tax || 0),
            amount: parseFloat(r.amount || 0)
        }));

        res.json({
            period: { 
                start: sd, 
                end: ed,
                fy: fy ? parseInt(fy) : null,
                month: month ? parseInt(month) : null
            },
            overall: {
                total_lines: parseInt(overall.rows[0].lines || 0),
                total_qty: parseFloat(overall.rows[0].qty || 0),
                total_taxable: parseFloat(overall.rows[0].taxable || 0),
                total_tax: parseFloat(overall.rows[0].tax || 0),
                total_amount: parseFloat(overall.rows[0].amount || 0)
            },
            by_product: formatData(products.rows),
            by_customer: formatData(customers.rows),
            by_dse: formatData(dses.rows),
            by_brand: formatData(brands.rows),
            by_category: formatData(categories.rows),
            by_route: formatData(routes.rows)
        });
    } catch (err) {
        console.error('Sales Summary Detailed Report Error:', err);
        res.status(500).json({ error: err.message });
    }
});


// --- 5. BALANCE SHEET (ULTRA PROFESSIONAL / CORPORATE GRADE) ---
// Note: Balance Sheet is point-in-time. We show data up to the 'end_date' of the period.
router.get('/reports/balance-sheet', async (req, res) => {
    try {
        const { fy, quarter, month } = req.query;
        const now = new Date();
        
        let ed; // End date for point-in-time balance
        let sd; // Start date of current FY (for profit isolation)

        // Determine Report Date (ed) and Current FY Start (sd)
        if (fy) {
            const startYear = parseInt(fy);
            sd = `${startYear}-04-01`;
            ed = `${startYear + 1}-03-31`; 

            if (quarter) {
                const q = parseInt(quarter);
                if (q === 1) ed = `${startYear}-06-30`;
                else if (q === 2) ed = `${startYear}-09-30`;
                else if (q === 3) ed = `${startYear}-12-31`;
                else if (q === 4) ed = `${startYear + 1}-03-31`;
            } else if (month) {
                const m = parseInt(month);
                let calYear = m >= 1 && m <= 3 ? startYear + 1 : startYear;
                ed = new Date(calYear, m, 0).toISOString().split('T')[0];
            }
        } else {
            ed = now.toISOString().split('T')[0];
            // Infer FY Start (Current April 1st)
            const currentMonth = now.getMonth() + 1; // 1-indexed
            const currentYear = now.getFullYear();
            sd = (currentMonth >= 4) ? `${currentYear}-04-01` : `${currentYear - 1}-04-01`;
        }

        // 1. Fetch Balances for ASSET, LIABILITY, EQUITY (Net across history up to ed)
        const balRes = await pool.query(`
            SELECT 
                coa.code,
                coa.name,
                coa.type,
                COALESCE(SUM(jl.debit - jl.credit), 0) as net_debit_balance
            FROM journal_lines jl
            JOIN journal_entries je ON jl.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jl.account_id = coa.id
            WHERE coa.type IN ('ASSET', 'LIABILITY', 'EQUITY')
              AND je.transaction_date <= $1
            GROUP BY coa.id, coa.code, coa.name, coa.type
            ORDER BY coa.code ASC
        `, [ed]);

        // 2. [SMART ISOLATION] Prior vs Current Period Profit
        // Prior Period Profit (Accumulated before this FY)
        const priorProfitRes = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN coa.type = 'INCOME' THEN (jl.credit - jl.debit) ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN coa.type = 'EXPENSE' THEN (jl.debit - jl.credit) ELSE 0 END), 0) as prior_profit
            FROM journal_lines jl
            JOIN journal_entries je ON jl.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jl.account_id = coa.id
            WHERE coa.type IN ('INCOME', 'EXPENSE')
              AND je.transaction_date < $1
        `, [sd]);

        // Current Period Profit (Profit within this FY up to ed)
        const currentProfitRes = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN coa.type = 'INCOME' THEN (jl.credit - jl.debit) ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN coa.type = 'EXPENSE' THEN (jl.debit - jl.credit) ELSE 0 END), 0) as net_profit
            FROM journal_lines jl
            JOIN journal_entries je ON jl.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jl.account_id = coa.id
            WHERE coa.type IN ('INCOME', 'EXPENSE')
              AND je.transaction_date >= $1 AND je.transaction_date <= $2
        `, [sd, ed]);

        const priorPeriodProfit = parseFloat(priorProfitRes.rows[0].prior_profit);
        const currentNetProfit = parseFloat(currentProfitRes.rows[0].net_profit);

        // 3. Structure the Report into Corporate Hierarchy
        const sections = {
            assets: {
                title: "Assets",
                fixed_assets: { title: "Fixed Assets (Net)", lines: [], total: 0 },
                current_assets: { title: "Current Assets", lines: [], total: 0 },
                total: 0
            },
            liabilities_equity: {
                title: "Liabilities & Equity",
                current_liabilities: { title: "Current Liabilities", lines: [], total: 0 },
                long_term_liabilities: { title: "Long Term Liabilities", lines: [], total: 0 },
                equity: { title: "Equity", lines: [], total: 0 },
                total: 0
            }
        };

        let depreciationBalance = 0;

        balRes.rows.forEach(row => {
            const code = parseInt(row.code);
            const balance = parseFloat(row.net_debit_balance);
            
            if (balance === 0 && code !== 3999) return; // Keep 3999 even if zero for audit

            const lineItem = { code: row.code, name: row.name, amount: 0 };

            if (row.type === 'ASSET') {
                if (code === 1210) { // Accumulated Depreciation
                    depreciationBalance += balance;
                    return; // Will handle as deduction later
                }

                lineItem.amount = balance;
                if (code >= 1200 && code <= 1299) {
                    sections.assets.fixed_assets.lines.push(lineItem);
                    sections.assets.fixed_assets.total += balance;
                } else {
                    sections.assets.current_assets.lines.push(lineItem);
                    sections.assets.current_assets.total += balance;
                }
                sections.assets.total += balance;
            } else if (row.type === 'LIABILITY' || row.type === 'EQUITY') {
                const creditBalance = -balance; 
                lineItem.amount = creditBalance;
                
                if (row.type === 'EQUITY' || code === 3999) {
                    // Corporate Clean-up: Rename technical offset accounts
                    if (code === 3999) {
                        lineItem.name = "Opening Migration Adjustments";
                        sections.liabilities_equity.equity.lines.push(lineItem);
                        sections.liabilities_equity.equity.total += creditBalance;
                    } else {
                        sections.liabilities_equity.equity.lines.push(lineItem);
                        sections.liabilities_equity.equity.total += creditBalance;
                    }
                } else if (code >= 2100) {
                    sections.liabilities_equity.long_term_liabilities.lines.push(lineItem);
                    sections.liabilities_equity.long_term_liabilities.total += creditBalance;
                } else {
                    sections.liabilities_equity.current_liabilities.lines.push(lineItem);
                    sections.liabilities_equity.current_liabilities.total += creditBalance;
                }
                sections.liabilities_equity.total += creditBalance;
            }
        });

        // 4. [FIX] Handle Accumulated Depreciation as a Deduction
        if (depreciationBalance !== 0) {
            sections.assets.fixed_assets.lines.push({ 
                code: "1210", 
                name: "Less: Accumulated Depreciation", 
                amount: depreciationBalance // This will be negative
            });
            sections.assets.fixed_assets.total += depreciationBalance;
            sections.assets.total += depreciationBalance;
        }

        // 5. [FIX] Add Retained Earnings (Prior + Migration)
        const totalOpeningEquity = priorPeriodProfit;
        if (totalOpeningEquity !== 0) {
            sections.liabilities_equity.equity.lines.push({ 
                code: "RE-OPEN", 
                name: "Opening Retained Earnings (Prior Years)", 
                amount: totalOpeningEquity 
            });
            sections.liabilities_equity.equity.total += totalOpeningEquity;
            sections.liabilities_equity.total += totalOpeningEquity;
        }

        // 6. Injected Professional Bridge: Current Year Profit
        if (currentNetProfit !== 0) {
            const profitLabel = currentNetProfit >= 0 ? "Surplus (Net Profit for Period)" : "Deficit (Net Loss for Period)";
            sections.liabilities_equity.equity.lines.push({ code: "PL-CUR", name: profitLabel, amount: currentNetProfit });
            sections.liabilities_equity.equity.total += currentNetProfit;
            sections.liabilities_equity.total += currentNetProfit;
        }

        res.json({
            as_of: ed,
            fy_start: sd,
            sections: sections,
            summary: {
                total_assets: sections.assets.total,
                total_liabilities_and_equity: sections.liabilities_equity.total,
                is_balanced: Math.abs(sections.assets.total - sections.liabilities_equity.total) < 0.05
            }
        });

    } catch (err) {
        console.error('Balance Sheet Report Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

// --- INTEGRITY AUDIT API ---
// Scans transactional modules for sync gaps with General Ledger
router.get('/reports/integrity-audit', async (req, res) => {
    const client = await pool.connect();
    try {
        const modules = [
            { name: 'Income', table: 'other_income', type: 'OTHER_INC' },
            { name: 'Expenses', table: 'expenses', type: 'EXPENSE' },
            { name: 'Debit Notes', table: 'debit_notes', type: 'DEBIT_NOTE' },
            { name: 'Sales Invoices', table: 'sales_invoices', type: 'SALES_INV' },
            { name: 'Sales Returns', table: 'sales_returns', type: 'SALES_RET' },
            { name: 'Customer Payments', table: 'customer_payments', type: 'CUST_PAY' },
            { name: 'Purchase Invoices', table: 'purchase_invoice_headers', type: 'PURCH_INV' },
            { name: 'Vendor Payments', table: 'vendor_payments', type: 'PAYMENT' },
            { name: 'Internal Transfers', table: 'internal_transfers', type: 'TRANSFER' },
            { name: 'Loan Transactions', table: 'loan_transactions', type: 'LOAN_TRX' },
            { name: 'Stock Adjustments', table: 'stock_adjustments', type: 'STK_ADJ' },
            { name: 'Asset Transactions', table: 'asset_transactions', type: 'ASSET_TRX' },
            { name: 'Employee Salaries', table: 'employee_salaries', type: 'SALARY' },
            { name: 'Employee Advances', table: 'employee_advances', type: 'EMP_ADV' }
        ];

        const report = {};
        let totalGaps = 0;

        for (const mod of modules) {
            // 1. Dynamic Active-Status Detector
            let activeClause = "1=1"; // Default: everything is active
            
            // Check for specific status columns based on the module's schema
            if (['sales_invoices', 'sales_returns', 'customer_payments', 'purchase_invoice_headers', 'debit_notes'].includes(mod.table)) {
                activeClause = "status NOT IN ('Cancelled', 'Reversed')";
            } else if (['other_income', 'expenses', 'internal_transfers', 'vendor_payments'].includes(mod.table)) {
                activeClause = "is_active = true";
            }
            // Tables like stock_adjustments, employee_salaries, asset_transactions usually don't have soft-deletes yet

            // 2. Fetch Active Module IDs
            const tableData = await client.query(`SELECT id::text FROM ${mod.table} WHERE ${activeClause}`);
            const tableIds = new Set(tableData.rows.map(r => r.id));

            // 3. Fetch Ledger Reference IDs
            const ledgerData = await client.query(`SELECT reference_id FROM journal_entries WHERE reference_type = $1 AND reference_id IS NOT NULL`, [mod.type]);
            const ledgerIds = new Set(ledgerData.rows.map(r => r.reference_id));

            // 4. Find Missing & Orphans (records in DB but missing from Ledger)
            const missing = [...tableIds].filter(id => !ledgerIds.has(id));
            const orphans = [...ledgerIds].filter(id => id.match(/^[0-9]+$/) && !tableIds.has(id));

            totalGaps += missing.length;

            report[mod.name] = {
                status: missing.length === 0 ? 'Consistent' : 'Gaps Detected',
                missing_count: missing.length,
                orphan_count: orphans.length,
                active_filter: activeClause
            };
        }

        res.json({
            timestamp: new Date().toISOString(),
            integrity_score: totalGaps === 0 ? '100%' : Math.max(0, 100 - (totalGaps / 10)).toFixed(2) + '%',
            total_gaps: totalGaps,
            module_health: report
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// --- [NEW] BRAND HISTORY & FORENSICS API ---
router.get('/brands/:id/history', async (req, res) => {
    try {
        const brandId = parseInt(req.params.id);
        if (isNaN(brandId)) {
            return res.status(400).json({ error: "Invalid brand ID" });
        }

        const { month, type = 'all' } = req.query;

        // 1. Fetch Brand Info
        const brandRes = await pool.query('SELECT * FROM brands WHERE id = $1', [brandId]);
        if (brandRes.rows.length === 0) {
            return res.status(404).json({ error: "Brand not found" });
        }
        const brand = brandRes.rows[0];

        // 2. Fetch Brand Stock Valuation
        const stockRes = await pool.query(`
            SELECT 
                COALESCE(SUM(ib.quantity_remaining), 0) as stock_qty,
                COALESCE(SUM(ib.quantity_remaining * ib.purchase_rate), 0) as stock_valuation
            FROM inventory_batches ib
            JOIN products p ON ib.product_id = p.id
            WHERE p.brand_id = $1 AND ib.quantity_remaining > 0
        `, [brandId]);
        const stock = stockRes.rows[0];

        // 3. Overall Summary (Aggregate Metrics)
        const summaryQueries = {
            sales: pool.query(`
                SELECT 
                    COALESCE(SUM(sil.shipped_qty), 0) as qty,
                    COALESCE(SUM(sil.taxable_amount), 0) as taxable,
                    COALESCE(SUM(sil.tax_amount), 0) as tax,
                    COALESCE(SUM(sil.amount), 0) as amount
                FROM sales_invoice_lines sil
                JOIN sales_invoices si ON sil.invoice_id = si.id
                JOIN products p ON sil.product_id = p.id
                WHERE p.brand_id = $1 AND si.status != 'Cancelled'
            `, [brandId]),
            purchases: pool.query(`
                SELECT 
                    COALESCE(SUM(pil.accepted_qty), 0) as qty,
                    COALESCE(SUM(pil.rate * pil.accepted_qty), 0) as taxable,
                    COALESCE(SUM(pil.tax_amount), 0) as tax,
                    COALESCE(SUM(pil.amount), 0) as amount
                FROM purchase_invoice_lines pil
                JOIN purchase_invoice_headers pih ON pil.purchase_invoice_header_id = pih.id
                JOIN products p ON pil.product_id = p.id
                WHERE p.brand_id = $1 AND pih.status != 'Cancelled'
            `, [brandId]),
            sales_returns: pool.query(`
                SELECT 
                    COALESCE(SUM(srl.qty), 0) as qty,
                    COALESCE(SUM(srl.rate * srl.qty), 0) as taxable,
                    COALESCE(SUM(srl.tax_amount), 0) as tax,
                    COALESCE(SUM(srl.amount), 0) as amount
                FROM sales_return_lines srl
                JOIN sales_returns sr ON srl.return_id = sr.id
                JOIN products p ON srl.product_id = p.id
                WHERE p.brand_id = $1 AND sr.status != 'Cancelled'
            `, [brandId]),
            purchase_returns: pool.query(`
                SELECT 
                    COALESCE(SUM(dnl.qty), 0) as qty,
                    COALESCE(SUM(dnl.amount), 0) as amount
                FROM debit_note_lines dnl
                JOIN debit_notes dn ON dnl.debit_note_id = dn.id
                JOIN products p ON dnl.product_id = p.id
                WHERE p.brand_id = $1 AND dn.status != 'Cancelled'
            `, [brandId])
        };

        const [salesSum, purchaseSum, salesRetSum, purchaseRetSum] = await Promise.all([
            summaryQueries.sales,
            summaryQueries.purchases,
            summaryQueries.sales_returns,
            summaryQueries.purchase_returns
        ]);

        const sSum = salesSum.rows[0];
        const pSum = purchaseSum.rows[0];
        const srSum = salesRetSum.rows[0];
        const prSum = purchaseRetSum.rows[0];

        // Format summaries as float numbers
        const totalSalesQty = parseFloat(sSum.qty);
        const totalSalesTaxable = parseFloat(sSum.taxable);
        const totalSalesTax = parseFloat(sSum.tax);
        const totalSalesAmount = parseFloat(sSum.amount);

        const totalPurchQty = parseFloat(pSum.qty);
        const totalPurchTaxable = parseFloat(pSum.taxable);
        const totalPurchTax = parseFloat(pSum.tax);
        const totalPurchAmount = parseFloat(pSum.amount);

        const totalSalesRetQty = parseFloat(srSum.qty);
        const totalSalesRetTaxable = parseFloat(srSum.taxable);
        const totalSalesRetTax = parseFloat(srSum.tax);
        const totalSalesRetAmount = parseFloat(srSum.amount);

        const totalPurchRetQty = parseFloat(prSum.qty);
        const totalPurchRetAmount = parseFloat(prSum.amount);

        // Margins Calculations
        const avgSalesRate = totalSalesQty > 0 ? totalSalesTaxable / totalSalesQty : 0;
        const avgPurchaseRate = totalPurchQty > 0 ? totalPurchTaxable / totalPurchQty : 0;
        const grossMargin = avgSalesRate > 0 ? ((avgSalesRate - avgPurchaseRate) / avgSalesRate) * 100 : 0;

        const netSalesQty = totalSalesQty - totalSalesRetQty;
        const netSalesTaxable = totalSalesTaxable - totalSalesRetTaxable;
        const netSalesAmount = totalSalesAmount - totalSalesRetAmount;

        const netPurchQty = totalPurchQty - totalPurchRetQty;
        const netPurchAmount = totalPurchAmount - totalPurchRetAmount;

        const netCOGS = netSalesQty * avgPurchaseRate;
        const netRealizedMargin = netSalesTaxable > 0 ? ((netSalesTaxable - netCOGS) / netSalesTaxable) * 100 : 0;

        // 4. Monthly Trend Analytics (Last 12 Months)
        const monthlyRes = await pool.query(`
            WITH months AS (
                SELECT generate_series(
                    DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months', 
                    DATE_TRUNC('month', CURRENT_DATE), 
                    '1 month'::interval
                )::date as month_start
            )
            SELECT 
                TO_CHAR(m.month_start, 'YYYY-MM') as month_label,
                -- Sales
                COALESCE((
                    SELECT SUM(sil.amount) 
                    FROM sales_invoice_lines sil 
                    JOIN sales_invoices si ON sil.invoice_id = si.id 
                    JOIN products p ON sil.product_id = p.id
                    WHERE p.brand_id = $1 AND si.status != 'Cancelled' AND DATE_TRUNC('month', si.invoice_date) = m.month_start
                ), 0) as sales_amount,
                -- Purchases
                COALESCE((
                    SELECT SUM(pil.amount) 
                    FROM purchase_invoice_lines pil 
                    JOIN purchase_invoice_headers pih ON pil.purchase_invoice_header_id = pih.id 
                    JOIN products p ON pil.product_id = p.id
                    WHERE p.brand_id = $1 AND pih.status != 'Cancelled' AND DATE_TRUNC('month', pih.received_date) = m.month_start
                ), 0) as purchase_amount,
                -- Sales Returns
                COALESCE((
                    SELECT SUM(srl.amount) 
                    FROM sales_return_lines srl 
                    JOIN sales_returns sr ON srl.return_id = sr.id 
                    JOIN products p ON srl.product_id = p.id
                    WHERE p.brand_id = $1 AND sr.status != 'Cancelled' AND DATE_TRUNC('month', sr.return_date) = m.month_start
                ), 0) as sales_return_amount,
                -- Purchase Returns
                COALESCE((
                    SELECT SUM(dnl.amount) 
                    FROM debit_note_lines dnl 
                    JOIN debit_notes dn ON dnl.debit_note_id = dn.id 
                    JOIN products p ON dnl.product_id = p.id
                    WHERE p.brand_id = $1 AND dn.status != 'Cancelled' AND DATE_TRUNC('month', dn.debit_note_date) = m.month_start
                ), 0) as purchase_return_amount
            FROM months m
            ORDER BY m.month_start DESC
        `, [brandId]);

        // 5. Transaction Stream (Filterable)
        let params = [brandId];

        let dateFilterSales = "";
        let dateFilterPurch = "";
        let dateFilterSalesRet = "";
        let dateFilterPurchRet = "";

        if (month) {
            params.push(month);
            const paramIdx = params.length;
            dateFilterSales = ` AND TO_CHAR(si.invoice_date, 'YYYY-MM') = $${paramIdx}`;
            dateFilterPurch = ` AND TO_CHAR(pih.received_date, 'YYYY-MM') = $${paramIdx}`;
            dateFilterSalesRet = ` AND TO_CHAR(sr.return_date, 'YYYY-MM') = $${paramIdx}`;
            dateFilterPurchRet = ` AND TO_CHAR(dn.debit_note_date, 'YYYY-MM') = $${paramIdx}`;
        }

        const salesQuery = `
            SELECT 
                si.invoice_date::text as trans_date,
                'Sale' as trans_type,
                si.invoice_number as document_number,
                p.product_code,
                p.product_name,
                sil.shipped_qty as qty,
                sil.rate,
                sil.tax_amount as tax,
                sil.amount as total_amount,
                c.customer_name as party_name
            FROM sales_invoice_lines sil
            JOIN sales_invoices si ON sil.invoice_id = si.id
            JOIN products p ON sil.product_id = p.id
            JOIN customers c ON si.customer_id = c.id
            WHERE p.brand_id = $1 AND si.status != 'Cancelled' ${dateFilterSales}
        `;

        const purchaseQuery = `
            SELECT 
                pih.received_date::text as trans_date,
                'Purchase' as trans_type,
                pih.invoice_number as document_number,
                p.product_code,
                p.product_name,
                pil.accepted_qty as qty,
                pil.rate,
                pil.tax_amount as tax,
                pil.amount as total_amount,
                v.vendor_name as party_name
            FROM purchase_invoice_lines pil
            JOIN purchase_invoice_headers pih ON pil.purchase_invoice_header_id = pih.id
            JOIN products p ON pil.product_id = p.id
            JOIN vendors v ON pih.vendor_id = v.id
            WHERE p.brand_id = $1 AND pih.status != 'Cancelled' ${dateFilterPurch}
        `;

        const salesRetQuery = `
            SELECT 
                sr.return_date::text as trans_date,
                'Sales Return' as trans_type,
                sr.return_number as document_number,
                p.product_code,
                p.product_name,
                srl.qty as qty,
                srl.rate,
                srl.tax_amount as tax,
                srl.amount as total_amount,
                c.customer_name as party_name
            FROM sales_return_lines srl
            JOIN sales_returns sr ON srl.return_id = sr.id
            JOIN products p ON srl.product_id = p.id
            JOIN customers c ON sr.customer_id = c.id
            WHERE p.brand_id = $1 AND sr.status != 'Cancelled' ${dateFilterSalesRet}
        `;

        const purchaseRetQuery = `
            SELECT 
                dn.debit_note_date::text as trans_date,
                'Purchase Return' as trans_type,
                dn.debit_note_number as document_number,
                p.product_code,
                p.product_name,
                dnl.qty as qty,
                dnl.rate,
                0::numeric as tax,
                dnl.amount as total_amount,
                v.vendor_name as party_name
            FROM debit_note_lines dnl
            JOIN debit_notes dn ON dnl.debit_note_id = dn.id
            JOIN products p ON dnl.product_id = p.id
            JOIN vendors v ON dn.vendor_id = v.id
            WHERE p.brand_id = $1 AND dn.status != 'Cancelled' ${dateFilterPurchRet}
        `;

        let activeQueries = [];
        if (type === 'all' || type === 'sales') activeQueries.push(salesQuery);
        if (type === 'all' || type === 'purchases') activeQueries.push(purchaseQuery);
        if (type === 'all' || type === 'sales_returns') activeQueries.push(salesRetQuery);
        if (type === 'all' || type === 'purchase_returns') activeQueries.push(purchaseRetQuery);

        const combinedQuery = `${activeQueries.join('\nUNION ALL\n')} ORDER BY trans_date DESC, document_number DESC LIMIT 100`;
        const streamRes = await pool.query(combinedQuery, params);

        res.json({
            brand: {
                id: brand.id,
                name: brand.brand_name,
                code: brand.brand_code,
                is_active: brand.is_active
            },
            stock_valuation: {
                qty: parseFloat(stock.stock_qty),
                valuation: parseFloat(stock.stock_valuation)
            },
            summary: {
                gross: {
                    sales: {
                        qty: totalSalesQty,
                        taxable: parseFloat(totalSalesTaxable.toFixed(2)),
                        tax: parseFloat(totalSalesTax.toFixed(2)),
                        amount: parseFloat(totalSalesAmount.toFixed(2))
                    },
                    purchases: {
                        qty: totalPurchQty,
                        taxable: parseFloat(totalPurchTaxable.toFixed(2)),
                        tax: parseFloat(totalPurchTax.toFixed(2)),
                        amount: parseFloat(totalPurchAmount.toFixed(2))
                    },
                    sales_returns: {
                        qty: totalSalesRetQty,
                        taxable: parseFloat(totalSalesRetTaxable.toFixed(2)),
                        tax: parseFloat(totalSalesRetTax.toFixed(2)),
                        amount: parseFloat(totalSalesRetAmount.toFixed(2))
                    },
                    purchase_returns: {
                        qty: totalPurchRetQty,
                        amount: parseFloat(totalPurchRetAmount.toFixed(2))
                    }
                },
                net: {
                    sales: {
                        qty: netSalesQty,
                        taxable: parseFloat(netSalesTaxable.toFixed(2)),
                        amount: parseFloat(netSalesAmount.toFixed(2))
                    },
                    purchases: {
                        qty: netPurchQty,
                        amount: parseFloat(netPurchAmount.toFixed(2))
                    }
                },
                margins: {
                    average_sales_rate: parseFloat(avgSalesRate.toFixed(2)),
                    average_purchase_rate: parseFloat(avgPurchaseRate.toFixed(2)),
                    gross_margin_pct: parseFloat(grossMargin.toFixed(2)) + '%',
                    net_realized_margin_pct: parseFloat(netRealizedMargin.toFixed(2)) + '%'
                }
            },
            monthly_trends: monthlyRes.rows.map(m => ({
                month: m.month_label,
                sales: parseFloat(m.sales_amount),
                purchase: parseFloat(m.purchase_amount),
                sales_return: parseFloat(m.sales_return_amount),
                purchase_return: parseFloat(m.purchase_return_amount),
                net_movement: parseFloat((parseFloat(m.sales_amount) - parseFloat(m.sales_return_amount) - (parseFloat(m.purchase_amount) - parseFloat(m.purchase_return_amount))).toFixed(2))
            })),
            transactions: streamRes.rows.map(t => ({
                ...t,
                qty: parseFloat(t.qty),
                rate: parseFloat(t.rate),
                tax: parseFloat(t.tax),
                total_amount: parseFloat(t.total_amount)
            }))
        });
    } catch (err) {
        console.error('Brand history route error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- [NEW] PRICE CHANGE ALERTS API FOR SALES STAFF ---
router.get('/price-alerts', async (req, res) => {
    try {
        const { brand_id, days = 14, limit = 50, offset = 0 } = req.query;

        let query = `
            WITH batch_sequence AS (
                SELECT 
                    ib.id as batch_id,
                    ib.product_id,
                    ib.batch_code,
                    ib.created_at as inward_date,
                    ib.mrp as new_mrp,
                    LAG(ib.mrp) OVER (PARTITION BY ib.product_id ORDER BY ib.id ASC) as old_mrp
                FROM inventory_batches ib
            )
            SELECT 
                bs.batch_id,
                bs.product_id,
                p.product_name,
                p.product_code,
                b.brand_name,
                bs.batch_code,
                bs.inward_date,
                bs.old_mrp,
                bs.new_mrp,
                (bs.new_mrp - bs.old_mrp) as mrp_change,
                -- Selling Rates (Exclusive of Tax)
                p.distributor_rate,
                p.wholesale_rate,
                p.dealer_rate,
                p.retail_rate
            FROM batch_sequence bs
            JOIN products p ON bs.product_id = p.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE 
                bs.old_mrp IS NOT NULL 
                AND bs.new_mrp != bs.old_mrp
                AND bs.new_mrp = p.mrp
                AND bs.inward_date >= NOW() - (CAST($1 AS INT) * INTERVAL '1 day')
        `;

        const params = [days.toString()];

        if (brand_id) {
            params.push(brand_id);
            query += ` AND p.brand_id = $${params.length}`;
        }

        query += ` ORDER BY bs.inward_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        const dataParams = [...params, parseInt(limit), parseInt(offset)];

        const result = await pool.query(query, dataParams);

        // Map and format results
        const alerts = result.rows.map(row => {
            const oldMrp = parseFloat(row.old_mrp || 0);
            const newMrp = parseFloat(row.new_mrp || 0);
            const absoluteChange = newMrp - oldMrp;
            const percentageChange = oldMrp > 0 ? (absoluteChange / oldMrp) * 100 : 0;
            
            let severity = 'Low';
            const absPct = Math.abs(percentageChange);
            if (absPct >= 10) severity = 'High';
            else if (absPct >= 5) severity = 'Medium';

            return {
                batch_id: parseInt(row.batch_id),
                product_id: parseInt(row.product_id),
                product_name: row.product_name,
                product_code: row.product_code,
                brand_name: row.brand_name,
                batch_code: row.batch_code,
                inward_date: row.inward_date,
                old_mrp: oldMrp,
                new_mrp: newMrp,
                mrp_change: parseFloat(absoluteChange.toFixed(2)),
                mrp_change_percentage: parseFloat(percentageChange.toFixed(2)),
                severity: severity,
                selling_prices: {
                    distributor_rate: parseFloat(row.distributor_rate || 0),
                    wholesale_rate: parseFloat(row.wholesale_rate || 0),
                    dealer_rate: parseFloat(row.dealer_rate || 0),
                    retail_rate: parseFloat(row.retail_rate || 0)
                }
            };
        });

        res.json({
            days_window: parseInt(days),
            count: alerts.length,
            alerts: alerts
        });

    } catch (err) {
        console.error('Price alerts route error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;


