const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const puppeteer = require('puppeteer');

router.get('/generate-corporate-report', async (req, res) => {
    try {
        const { fy, month, start_date, end_date } = req.query;

        // 1. Determine Date Range
        const now = new Date();
        let sd, ed;
        let titlePeriod = '';

        if (fy) {
            const startYear = parseInt(fy);
            sd = `${startYear}-04-01`;
            ed = `${startYear + 1}-03-31`;
            titlePeriod = `FY ${startYear}-${startYear + 1}`;

            if (month) {
                const m = parseInt(month);
                let calYear = startYear;
                if (m >= 1 && m <= 3) {
                    calYear = startYear + 1;
                }
                sd = `${calYear}-${m.toString().padStart(2, '0')}-01`;
                ed = new Date(calYear, m, 0).toISOString().split('T')[0];
                const monthName = new Date(calYear, m - 1).toLocaleString('default', { month: 'long' });
                titlePeriod = `${monthName} ${calYear}`;
            }
        } else {
            const fyStartYear = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
            sd = start_date || `${fyStartYear}-04-01`;
            ed = end_date || now.toISOString().split('T')[0];
            titlePeriod = `${sd} to ${ed}`;
        }

        // 2. Data Orchestrator: Fetch everything we need

        // A. Operational Data (Sales & Purchases)
        const opsQuery = `
            SELECT 
                (SELECT COALESCE(SUM(grand_total), 0) FROM sales_invoices WHERE invoice_date >= $1 AND invoice_date <= $2 AND status != 'Cancelled') as total_revenue,
                (SELECT COALESCE(SUM(grand_total), 0) FROM purchase_invoice_headers WHERE received_date >= $1 AND received_date <= $2 AND status != 'Cancelled') as total_cogs
        `;
        const opsRes = await pool.query(opsQuery, [sd, ed]);
        const opsData = opsRes.rows[0];

        // B. P&L (Income Statement)
        const pnlQuery = `
            SELECT 
                coa.type,
                coa.code,
                coa.name,
                COALESCE(SUM(CASE WHEN coa.type = 'INCOME' THEN (jl.credit - jl.debit) ELSE (jl.debit - jl.credit) END), 0) as balance
            FROM journal_lines jl
            JOIN journal_entries je ON jl.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jl.account_id = coa.id
            WHERE coa.type IN ('INCOME', 'EXPENSE')
              AND je.transaction_date >= $1 AND je.transaction_date <= $2
            GROUP BY coa.id, coa.code, coa.name, coa.type
            ORDER BY coa.code ASC
        `;
        const pnlRes = await pool.query(pnlQuery, [sd, ed]);
        
        let totalIncome = 0;
        let totalExpense = 0;
        let incomeLines = [];
        let expenseLines = [];

        pnlRes.rows.forEach(r => {
            const bal = parseFloat(r.balance);
            if (bal === 0) return;
            if (r.type === 'INCOME') {
                totalIncome += bal;
                incomeLines.push(r);
            } else {
                totalExpense += bal;
                expenseLines.push(r);
            }
        });
        const netProfit = totalIncome - totalExpense;

        // C. Balance Sheet (Point in Time up to ED)
        const bsQuery = `
            SELECT 
                coa.type,
                coa.code,
                coa.name,
                COALESCE(SUM(CASE WHEN coa.type = 'ASSET' THEN (jl.debit - jl.credit) ELSE (jl.credit - jl.debit) END), 0) as balance
            FROM journal_lines jl
            JOIN journal_entries je ON jl.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jl.account_id = coa.id
            WHERE coa.type IN ('ASSET', 'LIABILITY', 'EQUITY')
              AND je.transaction_date <= $1
            GROUP BY coa.id, coa.code, coa.name, coa.type
            ORDER BY coa.code ASC
        `;
        const bsRes = await pool.query(bsQuery, [ed]);

        let totalAssets = 0;
        let totalLiabilities = 0;
        let totalEquity = 0;
        let assetLines = [];
        let liabilityLines = [];
        let equityLines = [];

        // Calculate opening retained earnings (P&L prior to SD)
        const retainedQuery = `
             SELECT 
                COALESCE(SUM(CASE WHEN coa.type = 'INCOME' THEN (jl.credit - jl.debit) ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN coa.type = 'EXPENSE' THEN (jl.debit - jl.credit) ELSE 0 END), 0) as prior_profit
            FROM journal_lines jl
            JOIN journal_entries je ON jl.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jl.account_id = coa.id
            WHERE coa.type IN ('INCOME', 'EXPENSE')
              AND je.transaction_date < $1
        `;
        const retainedRes = await pool.query(retainedQuery, [sd]);
        const retainedEarnings = parseFloat(retainedRes.rows[0].prior_profit || 0);

        bsRes.rows.forEach(r => {
            const bal = parseFloat(r.balance);
            if (bal === 0) return;
            if (r.type === 'ASSET') {
                totalAssets += bal;
                assetLines.push(r);
            } else if (r.type === 'LIABILITY') {
                totalLiabilities += bal;
                liabilityLines.push(r);
            } else if (r.type === 'EQUITY') {
                if (r.code != 3999) { // Skip raw retained earnings offset account, we calculate it manually
                    totalEquity += bal;
                    equityLines.push(r);
                }
            }
        });

        // Add Retained Earnings and Current Profit to Equity
        equityLines.push({ name: 'Retained Earnings (Prior)', balance: retainedEarnings });
        totalEquity += retainedEarnings;
        equityLines.push({ name: 'Net Profit (Current Period)', balance: netProfit });
        totalEquity += netProfit;

        const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

        // 3. Generate HTML Template
        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Corporate Report</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                body {
                    font-family: 'Inter', sans-serif;
                    color: #1f2937;
                    margin: 0;
                    padding: 0;
                    background: #fff;
                }
                .page {
                    page-break-after: always;
                    padding: 40px 60px;
                    position: relative;
                }
                .page:last-child {
                    page-break-after: auto;
                }
                /* Cover Page */
                .cover {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: flex-start;
                    height: 100vh;
                    background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
                    color: white;
                    padding: 60px;
                }
                .cover h1 {
                    font-size: 48px;
                    margin: 0 0 20px 0;
                    font-weight: 700;
                    letter-spacing: -1px;
                }
                .cover h2 {
                    font-size: 24px;
                    font-weight: 400;
                    color: #94a3b8;
                    margin: 0;
                }
                .cover .period {
                    margin-top: 50px;
                    font-size: 18px;
                    color: #38bdf8;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }
                
                /* Standard Pages */
                .header {
                    display: flex;
                    justify-content: space-between;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 10px;
                    margin-bottom: 30px;
                }
                .header-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: #111827;
                }
                .header-date {
                    font-size: 14px;
                    color: #6b7280;
                }
                
                h3 {
                    font-size: 18px;
                    color: #374151;
                    margin-top: 30px;
                    margin-bottom: 15px;
                }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 30px;
                }
                th, td {
                    padding: 12px 15px;
                    text-align: left;
                    border-bottom: 1px solid #f3f4f6;
                    font-size: 13px;
                }
                th {
                    background-color: #f9fafb;
                    font-weight: 600;
                    color: #4b5563;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                td.amount {
                    text-align: right;
                    font-variant-numeric: tabular-nums;
                }
                th.amount-header {
                    text-align: right;
                }
                tr.total-row {
                    font-weight: 700;
                    background-color: #f3f4f6;
                }
                tr.total-row td {
                    border-top: 2px solid #d1d5db;
                    border-bottom: 2px solid #d1d5db;
                }
                
                /* Highlights Grid */
                .kpi-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 20px;
                    margin-bottom: 40px;
                }
                .kpi-card {
                    background: #f8fafc;
                    border-left: 4px solid #0ea5e9;
                    padding: 20px;
                    border-radius: 4px;
                }
                .kpi-title {
                    font-size: 12px;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 5px;
                }
                .kpi-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: #0f172a;
                }
            </style>
        </head>
        <body>
            <!-- Cover Page -->
            <div class="cover">
                <h1>Gniderton ERP</h1>
                <h2>Corporate Financial Snapshot</h2>
                <div class="period">${titlePeriod}</div>
            </div>

            <!-- Executive Summary -->
            <div class="page">
                <div class="header">
                    <div class="header-title">Executive Summary</div>
                    <div class="header-date">Period: ${titlePeriod}</div>
                </div>
                
                <div class="kpi-grid">
                    <div class="kpi-card">
                        <div class="kpi-title">Gross Revenue (Sales)</div>
                        <div class="kpi-value">${formatCurrency(opsData.total_revenue)}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-title">Total COGS (Purchases)</div>
                        <div class="kpi-value">${formatCurrency(opsData.total_cogs)}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-title">Net Profit (Ledger)</div>
                        <div class="kpi-value">${formatCurrency(netProfit)}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-title">Total Assets</div>
                        <div class="kpi-value">${formatCurrency(totalAssets)}</div>
                    </div>
                </div>
                
                <p style="font-size: 14px; line-height: 1.6; color: #4b5563;">
                    This Corporate Financial Snapshot presents a consolidated view of the company's financial health. 
                    The data is aggregated directly from the core ledger (Journal Entries) and operational modules (Invoicing). 
                    The Profit & Loss statement reflects activity within the selected period, while the Balance Sheet reflects the net position as of ${ed}.
                </p>
            </div>

            <!-- Profit & Loss -->
            <div class="page">
                <div class="header">
                    <div class="header-title">Income Statement (P&L)</div>
                    <div class="header-date">Period: ${titlePeriod}</div>
                </div>
                
                <h3>Income</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Account Code</th>
                            <th>Account Name</th>
                            <th class="amount-header">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${incomeLines.map(l => `
                            <tr>
                                <td>${l.code}</td>
                                <td>${l.name}</td>
                                <td class="amount">${formatCurrency(l.balance)}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="2">Total Income</td>
                            <td class="amount">${formatCurrency(totalIncome)}</td>
                        </tr>
                    </tbody>
                </table>

                <h3>Expenses</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Account Code</th>
                            <th>Account Name</th>
                            <th class="amount-header">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${expenseLines.map(l => `
                            <tr>
                                <td>${l.code}</td>
                                <td>${l.name}</td>
                                <td class="amount">${formatCurrency(l.balance)}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="2">Total Expenses</td>
                            <td class="amount">${formatCurrency(totalExpense)}</td>
                        </tr>
                    </tbody>
                </table>
                
                <table style="margin-top: 40px; background: #e0f2fe;">
                    <tr class="total-row">
                        <td style="font-size: 16px;">NET PROFIT / (LOSS)</td>
                        <td class="amount" style="font-size: 16px; color: ${netProfit < 0 ? '#ef4444' : '#0369a1'};">${formatCurrency(netProfit)}</td>
                    </tr>
                </table>
            </div>

            <!-- Balance Sheet -->
            <div class="page">
                <div class="header">
                    <div class="header-title">Balance Sheet</div>
                    <div class="header-date">As of: ${ed}</div>
                </div>

                <h3>Assets</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Account Code</th>
                            <th>Account Name</th>
                            <th class="amount-header">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${assetLines.map(l => `
                            <tr>
                                <td>${l.code || ''}</td>
                                <td>${l.name}</td>
                                <td class="amount">${formatCurrency(l.balance)}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="2">Total Assets</td>
                            <td class="amount">${formatCurrency(totalAssets)}</td>
                        </tr>
                    </tbody>
                </table>

                <h3>Liabilities</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Account Code</th>
                            <th>Account Name</th>
                            <th class="amount-header">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${liabilityLines.map(l => `
                            <tr>
                                <td>${l.code || ''}</td>
                                <td>${l.name}</td>
                                <td class="amount">${formatCurrency(l.balance)}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="2">Total Liabilities</td>
                            <td class="amount">${formatCurrency(totalLiabilities)}</td>
                        </tr>
                    </tbody>
                </table>

                <h3>Equity</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Account Code</th>
                            <th>Account Name</th>
                            <th class="amount-header">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${equityLines.map(l => `
                            <tr>
                                <td>${l.code || ''}</td>
                                <td>${l.name}</td>
                                <td class="amount">${formatCurrency(l.balance)}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="2">Total Equity</td>
                            <td class="amount">${formatCurrency(totalEquity)}</td>
                        </tr>
                    </tbody>
                </table>

                <table style="margin-top: 40px; background: ${Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1 ? '#dcfce7' : '#fee2e2'};">
                    <tr class="total-row">
                        <td style="font-size: 16px;">TOTAL LIABILITIES & EQUITY</td>
                        <td class="amount" style="font-size: 16px;">${formatCurrency(totalLiabilities + totalEquity)}</td>
                    </tr>
                </table>
                <div style="text-align: right; font-size: 11px; color: #6b7280; margin-top: 5px;">
                    Balance Check: ${Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1 ? 'Balanced' : 'Out of Balance'}
                </div>
            </div>
        </body>
        </html>
        `;

        // 4. Render PDF with Puppeteer
        const browser = await puppeteer.launch({ 
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' } // Margins are handled in CSS
        });

        await browser.close();

        // 5. Send PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Corporate_Report_${titlePeriod.replace(/ /g, '_')}.pdf"`);
        res.send(pdfBuffer);

    } catch (err) {
        console.error('Corporate Report Generation Error:', err);
        res.status(500).json({ error: 'Failed to generate report', details: err.message });
    }
});

// GET /api/reports/customer-advances - Get Customer Advances Report
router.get('/customer-advances', async (req, res) => {
    try {
        const { start_date, end_date, dse_id, customer_id } = req.query;

        let query = `
            SELECT 
                ca.customer_id,
                c.customer_name,
                e.full_name as dse_name,
                SUM(ca.balance) AS total_advance_balance,
                COUNT(ca.id) AS advance_count,
                MAX(ca.created_at) AS last_advance_date
            FROM customer_advances ca
            JOIN customers c ON ca.customer_id = c.id
            LEFT JOIN employees e ON c.dse_id = e.id
            WHERE ca.is_active = true AND ca.balance > 0
        `;
        
        let params = [];
        let paramIndex = 1;

        if (start_date) {
            query += ` AND ca.created_at >= $${paramIndex++}`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND ca.created_at <= $${paramIndex++}::timestamp + interval '1 day' - interval '1 second'`;
            params.push(end_date);
        }
        if (dse_id) {
            query += ` AND c.dse_id = $${paramIndex++}`;
            params.push(dse_id);
        }
        if (customer_id) {
            query += ` AND ca.customer_id = $${paramIndex++}`;
            params.push(customer_id);
        }

        query += ` GROUP BY ca.customer_id, c.customer_name, e.full_name ORDER BY total_advance_balance DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Customer Advance Report Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
