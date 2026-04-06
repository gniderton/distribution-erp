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

        // 1. Sales, Rank & General Metrics (Aggregated from the same view as the activity)
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

        // 2. Customer Limits Info
        const custRes = await pool.query(`
            SELECT customer_name, credit_limit, credit_days 
            FROM customers WHERE id = $1
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

        // 4. Last Activity (Recent 10 Transactions)
        const recentRes = await pool.query(`
            SELECT type, reference_number, date, debit_amount, credit_amount, status
            FROM view_customer_ledger
            WHERE customer_id = $1
            ORDER BY date DESC, id DESC
            LIMIT 10
        `, [id]);

        // 5. Brand-wise Sales (FY: April 1 - March 31)
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

        // Validation: Ensure ID is a number
        if (isNaN(id) || isNaN(parseInt(id))) {
            return res.status(400).json({ 
                error: "Invalid Employee ID", 
                message: `Received '${id}' but expected a numeric employee ID. Please check your Appsmith variable mapping.` 
            });
        }
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        // 1. Calculate Periods
        const monthStart = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
        
        let fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
        const fyStart = `${fyStartYear}-04-01`;

        // 2. Fetch Assigned Customer IDs
        const custRes = await pool.query('SELECT id FROM customers WHERE dse_id = $1', [id]);
        const customerIds = custRes.rows.map(r => r.id);

        if (customerIds.length === 0) {
            return res.json({
                message: "No customers assigned to this employee",
                metrics: { month: {}, fy: {} },
                top_customers: [],
                brand_sales: [],
                ageing: {},
                zero_billing: []
            });
        }

        const getPeriodMetrics = async (startDate) => {
            // A. Core Totals (Taxable)
            const stats = await pool.query(`
                SELECT 
                    COALESCE(SUM(total_taxable), 0) as gross_sales,
                    (SELECT COALESCE(SUM(total_taxable), 0) FROM sales_returns WHERE customer_id = ANY($1) AND return_date >= $2 AND status = 'Applied') as returns,
                    (SELECT COALESCE(SUM(amount), 0) FROM customer_payments WHERE collected_by = $3 AND payment_date >= $2 AND status = 'Verified') as collection
                FROM sales_invoices 
                WHERE customer_id = ANY($1) AND invoice_date >= $2 AND status != 'Cancelled'
            `, [customerIds, startDate, id]);

            // B. Avg Credit Days
            const creditRes = await pool.query(`
                SELECT COALESCE(AVG(p.payment_date - sih.invoice_date), 0) as avg_days
                FROM customer_payment_allocations cpa
                JOIN sales_invoices sih ON cpa.invoice_id = sih.id
                JOIN customer_payments p ON cpa.payment_id = p.id
                WHERE sih.customer_id = ANY($1) 
                  AND sih.invoice_date >= $2
                  AND cpa.status = 'ACTIVE'
            `, [customerIds, startDate]);

            const s = stats.rows[0];
            return {
                gross_sales_taxable: parseFloat(s.gross_sales),
                returns_taxable: parseFloat(s.returns),
                net_sales_taxable: parseFloat(s.gross_sales) - parseFloat(s.returns),
                collection: parseFloat(s.collection),
                avg_credit_days: Math.round(parseFloat(creditRes.rows[0].avg_days))
            };
        };

        // Execution
        const monthMetrics = await getPeriodMetrics(monthStart);
        const fyMetrics = await getPeriodMetrics(fyStart);

        // 4. Top 10 Customers (Month)
        const topCustomers = await pool.query(`
            SELECT 
                c.customer_name,
                COALESCE(SUM(si.total_taxable), 0) as taxable_sales
            FROM customers c
            JOIN sales_invoices si ON c.id = si.customer_id
            WHERE c.dse_id = $1 AND si.invoice_date >= $2 AND si.status != 'Cancelled'
            GROUP BY c.id, c.customer_name
            ORDER BY taxable_sales DESC
            LIMIT 10
        `, [id, monthStart]);

        // 5. Brand-wise Sales (Month)
        const brandSales = await pool.query(`
            SELECT 
                b.brand_name,
                COALESCE(SUM(sil.rate * sil.shipped_qty), 0) as taxable_sales
            FROM sales_invoice_lines sil
            JOIN sales_invoices si ON sil.invoice_id = si.id
            JOIN products p ON sil.product_id = p.id
            JOIN brands b ON p.brand_id = b.id
            WHERE si.customer_id = ANY($1) AND si.invoice_date >= $2 AND si.status != 'Cancelled'
            GROUP BY b.id, b.brand_name
            ORDER BY taxable_sales DESC
        `, [customerIds, monthStart]);

        // 6. Category-wise Sales (Month)
        const catSales = await pool.query(`
            SELECT 
                cat.category_name,
                COALESCE(SUM(sil.rate * sil.shipped_qty), 0) as taxable_sales
            FROM sales_invoice_lines sil
            JOIN sales_invoices si ON sil.invoice_id = si.id
            JOIN products p ON sil.product_id = p.id
            JOIN categories cat ON p.category_id = cat.id
            WHERE si.customer_id = ANY($1) AND si.invoice_date >= $2 AND si.status != 'Cancelled'
            GROUP BY cat.id, cat.category_name
            ORDER BY taxable_sales DESC
        `, [customerIds, monthStart]);

        // 7. Collection Ageing (Real-time)
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

        // 8. Zero-Billing Customers (On Today's Route + Last 30 Days)
        const zeroBilling = await pool.query(`
            SELECT c.customer_name, c.customer_phone, c.latitude, c.longitude,
                   (SELECT MAX(invoice_date) FROM sales_invoices WHERE customer_id = c.id) as last_invoice_date
            FROM customers c
            JOIN routes r ON c.route_id = r.id
            WHERE c.dse_id = $1 
              AND TRIM(TO_CHAR(CURRENT_DATE, 'Day')) ILIKE r.service_day
              AND NOT EXISTS (
                SELECT 1 FROM sales_invoices 
                WHERE customer_id = c.id AND invoice_date >= CURRENT_DATE - INTERVAL '30 days'
            )
            ORDER BY last_invoice_date ASC NULLS FIRST
        `, [id]);

        // 9. Target & Performance Points (Month)
        const targetRes = await pool.query(`
            SELECT 
                t.*,
                p.name as plan_name,
                p.config as plan_config,
                COALESCE((SELECT SUM(points) FROM performance_points_history WHERE employee_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3), 0) as total_points,
                COALESCE((SELECT COUNT(*) FROM employee_daily_achievement WHERE employee_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3 AND is_successful = TRUE), 0) as success_days
            FROM employee_targets t
            JOIN incentive_plans p ON t.plan_id = p.id
            WHERE t.employee_id = $1 AND t.month = $2 AND t.year = $3
        `, [id, currentMonth, currentYear]);

        res.json({
            metrics: {
                month: monthMetrics,
                fy: fyMetrics
            },
            top_customers: topCustomers.rows,
            brand_sales: brandSales.rows,
            category_sales: catSales.rows,
            ageing: ageingMap,
            zero_billing: zeroBilling.rows,
            performance: targetRes.rows[0] || { 
                total_points: 0, 
                success_days: 0, 
                sales_target_taxable: 0,
                plan_name: 'No Plan Assigned',
                plan_config: {}
            }
        });

    } catch (err) {
        console.error('Employee dashboard error:', err);
        res.status(500).json({ error: err.message });
    }
});


// --- SALES FY REPORT ---
router.get('/sales-fy-report', async (req, res) => {
    try {
        const { year } = req.query;
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        // Determine FY Start Year (Default to current FY)
        // If it's April or later, current year is FY start. Else previous year.
        let fyStartYear = year ? parseInt(year) : (currentMonth >= 4 ? currentYear : currentYear - 1);
        const fyEndYear = fyStartYear + 1;

        const fyStart = `${fyStartYear}-04-01`;
        const fyEnd = `${fyEndYear}-03-31`;

        const result = await pool.query(`
            WITH months AS (
                SELECT generate_series(
                    $1::date, 
                    $2::date, 
                    '1 month'::interval
                )::date as month_start
            ),
            sales AS (
                SELECT 
                    DATE_TRUNC('month', invoice_date)::date as month,
                    SUM(total_taxable) as taxable_sales
                FROM sales_invoices
                WHERE invoice_date >= $1 AND invoice_date <= $2 AND status NOT IN ('Cancelled', 'Reversed')
                GROUP BY 1
            ),
            returns AS (
                SELECT 
                    DATE_TRUNC('month', return_date)::date as month,
                    SUM(total_taxable) as taxable_returns
                FROM sales_returns
                WHERE return_date >= $1 AND return_date <= $2 AND status = 'Applied'
                GROUP BY 1
            )
            SELECT 
                m.month_start as month,
                TRIM(TO_CHAR(m.month_start, 'Month YYYY')) as month_name,
                COALESCE(s.taxable_sales, 0) as sales,
                COALESCE(r.taxable_returns, 0) as returns,
                (COALESCE(s.taxable_sales, 0) - COALESCE(r.taxable_returns, 0)) as net
            FROM months m
            LEFT JOIN sales s ON m.month_start = s.month
            LEFT JOIN returns r ON m.month_start = r.month
            ORDER BY m.month_start
        `, [fyStart, fyEnd]);

        const breakup = result.rows.map(r => ({
            month: r.month,
            month_name: r.month_name,
            sales: parseFloat(r.sales),
            returns: parseFloat(r.returns),
            net: parseFloat(r.net)
        }));

        const totalSales = breakup.reduce((acc, x) => acc + x.sales, 0);
        const totalReturns = breakup.reduce((acc, x) => acc + x.returns, 0);

        res.json({
            summary: {
                year_range: `April ${fyStartYear} - March ${fyEndYear}`,
                total_taxable_sales: totalSales,
                total_taxable_returns: totalReturns,
                net_taxable_sales: totalSales - totalReturns
            },
            monthly_breakup: breakup
        });
    } catch (err) {
        console.error('Sales FY report error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

