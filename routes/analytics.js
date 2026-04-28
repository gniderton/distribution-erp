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
            SELECT pih.vendor_invoice_date as invoice_date, v.vendor_name, pil.shipped_qty as qty, pil.rate
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

        // 5. Margin & Performance Analytics (Current Month)
        const performance = await pool.query(`
            SELECT 
                COALESCE(SUM(sil.shipped_qty), 0) as monthly_qty,
                COALESCE(SUM(sil.taxable_amount), 0) as monthly_taxable,
                COALESCE(AVG(sil.rate), 0) as avg_sales_rate,
                (SELECT AVG(rate) FROM purchase_invoice_lines WHERE product_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE)) as avg_purchase_rate
            FROM sales_invoice_lines sil
            JOIN sales_invoices si ON sil.invoice_id = si.id
            WHERE sil.product_id = $1 
              AND si.invoice_date >= date_trunc('month', CURRENT_DATE)
              AND si.status != 'Cancelled'
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

        // 8. Batch Breakdown
        const batches = await pool.query(`
            SELECT batch_code, quantity_remaining, purchase_rate, mrp, expiry_date, status
            FROM inventory_batches
            WHERE product_id = $1 AND quantity_remaining > 0
            ORDER BY expiry_date ASC
        `, [id]);

        const perf = performance.rows[0];
        const avgSales = parseFloat(perf.avg_sales_rate || 0);
        const avgPurch = parseFloat(perf.avg_purchase_rate || productInfo.rows[0].purchase_rate || 0);
        const margin = avgSales > 0 ? ((avgSales - avgPurch) / avgSales * 100).toFixed(2) : 0;

        res.json({
            product: productInfo.rows[0],
            analytics: {
                monthly_qty: parseFloat(perf.monthly_qty),
                monthly_value: parseFloat(perf.monthly_taxable),
                avg_sales_rate: avgSales.toFixed(2),
                avg_purchase_rate: avgPurch.toFixed(2),
                margin_pct: margin,
                trend: trend.rows,
                top_customers: topCustomers.rows
            },
            inventory: {
                total_stock: parseFloat(productInfo.rows[0].total_stock),
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

            if (quarter) {
                const q = parseInt(quarter);
                if (q === 1) { sd = `${startYear}-04-01`; ed = `${startYear}-06-30`; }
                else if (q === 2) { sd = `${startYear}-07-01`; ed = `${startYear}-09-30`; }
                else if (q === 3) { sd = `${startYear}-10-01`; ed = `${startYear}-12-31`; }
                else if (q === 4) { sd = `${startYear + 1}-01-01`; ed = `${startYear + 1}-03-31`; }
            } else if (month) {
                const m = parseInt(month); // 1 = Jan, 12 = Dec
                let calYear = startYear;
                if (m >= 1 && m <= 3) {
                    calYear = startYear + 1; // Jan-Mar belong to the next calendar year in this FY
                }
                sd = `${calYear}-${m.toString().padStart(2, '0')}-01`;
                ed = new Date(calYear, m, 0).toISOString().split('T')[0];
            }
        } else {
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

        const grossProfit = sections.revenue.total - sections.cogs.total;
        const netProfit = grossProfit - sections.operating_expenses.total + sections.other_income.total;

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

module.exports = router;
