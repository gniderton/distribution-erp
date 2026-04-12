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
        let fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
        const fyStart = `${fyStartYear}-04-01`;

        const custRes = await pool.query('SELECT id FROM customers WHERE dse_id = $1', [id]);
        const customerIds = custRes.rows.map(r => r.id);

        if (customerIds.length === 0) {
            return res.json({ message: "No customers assigned", metrics: { month: {}, fy: {} } });
        }

        const getPeriodMetrics = async (startDate) => {
            const stats = await pool.query(`
                SELECT 
                    COALESCE(SUM(total_taxable), 0) as gross_sales,
                    (SELECT COALESCE(SUM(total_taxable), 0) FROM sales_returns WHERE customer_id = ANY($1) AND return_date >= $2 AND status = 'Applied') as returns,
                    (SELECT COALESCE(SUM(amount), 0) FROM customer_payments WHERE collected_by = $3 AND payment_date >= $2 AND status = 'Verified') as collection
                FROM sales_invoices 
                WHERE customer_id = ANY($1) AND invoice_date >= $2 AND status != 'Cancelled'
            `, [customerIds, startDate, id]);

            const creditRes = await pool.query(`
                SELECT COALESCE(AVG(p.payment_date - sih.invoice_date), 0) as avg_days
                FROM customer_payment_allocations cpa
                JOIN sales_invoices sih ON cpa.invoice_id = sih.id
                JOIN customer_payments p ON cpa.payment_id = p.id
                WHERE sih.customer_id = ANY($1) AND sih.invoice_date >= $2 AND cpa.status = 'ACTIVE'
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

        const monthMetrics = await getPeriodMetrics(monthStart);
        const fyMetrics = await getPeriodMetrics(fyStart);

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

        const targetRes = await pool.query(`
            SELECT t.*, p.name as plan_name,
                COALESCE((SELECT SUM(points) FROM performance_points_history WHERE employee_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3), 0) as total_points
            FROM employee_targets t
            JOIN incentive_plans p ON t.plan_id = p.id
            WHERE t.employee_id = $1 AND t.month = $2 AND t.year = $3
        `, [id, currentMonth, currentYear]);

        res.json({
            metrics: { month: monthMetrics, fy: fyMetrics },
            top_customers: topCustomers.rows,
            brand_sales: brandSales.rows,
            ageing: ageingMap,
            performance: targetRes.rows[0] || { total_points: 0, plan_name: 'No Plan Assigned' }
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

// --- 2. PROFIT & LOSS (GL-POWERED) ---
router.get('/reports/p-and-l', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const now = new Date();
        const fyStart = `${now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1}-04-01`;
        const sd = start_date || fyStart;
        const ed = end_date || now.toISOString().split('T')[0];

        const stats = await pool.query(`
            SELECT 
                -- NET REVENUE (Sales 4001 + Returns 4003)
                (SELECT COALESCE(SUM(jl.credit - jl.debit), 0) FROM journal_lines jl JOIN journal_entries je ON jl.journal_entry_id = je.id JOIN chart_of_accounts coa ON jl.account_id = coa.id WHERE coa.code IN (4001, 4003) AND je.transaction_date >= $1 AND je.transaction_date <= $2) as revenue,
                
                -- COGS (Account 5001 and 5002 only)
                (SELECT COALESCE(SUM(jl.debit - jl.credit), 0) FROM journal_lines jl JOIN journal_entries je ON jl.journal_entry_id = je.id JOIN chart_of_accounts coa ON jl.account_id = coa.id WHERE (coa.code = 5001 OR coa.code = 5002) AND je.transaction_date >= $1 AND je.transaction_date <= $2) as cogs,
                
                -- OPERATING EXPENSES (All other Expense accounts)
                (SELECT COALESCE(SUM(jl.debit - jl.credit), 0) FROM journal_lines jl JOIN journal_entries je ON jl.journal_entry_id = je.id JOIN chart_of_accounts coa ON jl.account_id = coa.id WHERE coa.type = 'EXPENSE' AND coa.code NOT IN (5001, 5002) AND je.transaction_date >= $1 AND je.transaction_date <= $2) as expenses,
                
                -- OTHER INCOME (All other Income accounts, excluding Sales/Returns)
                (SELECT COALESCE(SUM(jl.credit - jl.debit), 0) FROM journal_lines jl JOIN journal_entries je ON jl.journal_entry_id = je.id JOIN chart_of_accounts coa ON jl.account_id = coa.id WHERE coa.type = 'INCOME' AND coa.code NOT IN (4001, 4003) AND je.transaction_date >= $1 AND je.transaction_date <= $2) as other_income
        `, [sd, ed]);



        const data = stats.rows[0];
        const revenue = parseFloat(data.revenue);
        const cogs = parseFloat(data.cogs);
        const expenses = parseFloat(data.expenses);
        const otherIncome = parseFloat(data.other_income);
        const grossProfit = revenue - cogs;

        res.json({ period: { start: sd, end: ed }, metrics: { revenue, cogs, gross_profit: grossProfit, gross_margin: revenue > 0 ? (grossProfit / revenue) * 100 : 0, operating_expenses: expenses, other_income: otherIncome, net_profit: grossProfit - expenses + otherIncome } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 4. BALANCE SHEET (GL-POWERED) ---
router.get('/reports/balance-sheet', async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                (SELECT COALESCE(SUM(jl.debit - jl.credit), 0) FROM journal_lines jl JOIN chart_of_accounts coa ON jl.account_id = coa.id WHERE coa.type = 'ASSET') as assets,
                (SELECT COALESCE(SUM(jl.credit - jl.debit), 0) FROM journal_lines jl JOIN chart_of_accounts coa ON jl.account_id = coa.id WHERE coa.type = 'LIABILITY') as liabilities,
                (SELECT COALESCE(SUM(jl.credit - jl.debit), 0) FROM journal_lines jl JOIN chart_of_accounts coa ON jl.account_id = coa.id WHERE coa.type = 'EQUITY') as equity
        `);

        const data = stats.rows[0];
        res.json({ as_of: new Date(), assets: parseFloat(data.assets), liabilities: parseFloat(data.liabilities), equity: parseFloat(data.equity), net_worth: parseFloat(data.assets) - parseFloat(data.liabilities) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 5. SALES FY REPORT (GL-POWERED) ---
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
                COALESCE(SUM(sil.amount - sil.tax_amount), 0) as total_taxable,
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
                p.product_name as product,
                p.product_code as sku,
                b.brand_name as brand,
                cat.category_name as category,
                sil.shipped_qty as qty,
                sil.rate as unit_rate,
                sil.tax_amount as tax,
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
                total_amount: parseFloat(row.total_amount)
            }))
        });
    } catch (err) {
        console.error('Sales Line Report Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

