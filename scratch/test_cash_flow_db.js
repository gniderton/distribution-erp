const { pool } = require('../config/db');

const testCashFlowLogic = async () => {
    try {
        const start_date = '2026-05-01';
        const end_date = '2026-05-31';

        const query = `
            SELECT 
                trans_date,
                party_name,
                description,
                amount_in,
                amount_out,
                source_table,
                source_id,
                liquid_account_id
            FROM view_unified_liquid_ledger
            WHERE trans_date >= $1 AND trans_date <= $2
            ORDER BY trans_date DESC, source_table ASC
        `;
        const result = await pool.query(query, [start_date, end_date]);
        
        // 🛡️ [IN-MEMORY JOIN] Include Cheque Clearing (Journal Entries)
        const clearQuery = `
            SELECT 
                je.transaction_date as trans_date,
                'CHEQUE CLEARING' as party_name,
                je.description,
                jl.debit as amount_in,
                jl.credit as amount_out,
                'journal_lines' as source_table,
                jl.id as source_id,
                COALESCE(jl.bank_account_id, jl.account_id) as liquid_account_id
            FROM journal_lines jl
            JOIN journal_entries je ON jl.journal_entry_id = je.id
            WHERE je.reference_type = 'CHQ_CLEAR'
              AND (jl.bank_account_id IS NOT NULL OR jl.account_id = 1004)
              AND je.transaction_date >= $1 AND je.transaction_date <= $2
        `;
        const clearResult = await pool.query(clearQuery, [start_date, end_date]);
        const rows = [...result.rows, ...clearResult.rows];

        console.log(`Retrieved ${rows.length} rows (${result.rows.length} from view, ${clearResult.rows.length} from clearing).`);

        const categoryMap = {
            'customer_payments': 'Operating Receipt (Collections)',
            'other_income': 'Operating Receipt (Other)',
            'vendor_payments': 'Operating Payment (Vendors)',
            'expenses': 'Operating Payment (Expenses)',
            'dse_expenses': 'Operating Payment (DSE)',
            'employee_salaries': 'Operating Payment (Payroll)',
            'employee_advances': 'Operating Payment (Advances)',
            'internal_transfers': 'Financing Activity (Internal Transfer)',
            'loan_transactions': 'Financing Activity (Loans)',
            'asset_transactions': 'Investing Activity (Assets)',
            'cheques': 'Liquidity Management (Cheques)',
            'journal_lines': 'Liquidity Management (Clearing)'
        };

        const getWeekRange = (dateStr) => {
            const d = new Date(dateStr);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(new Date(d).setDate(diff));
            const sunday = new Date(new Date(monday).setDate(monday.getDate() + 6));
            const options = { day: '2-digit', month: 'short' };
            return `${monday.toLocaleDateString('en-GB', options)} - ${sunday.toLocaleDateString('en-GB', options)}`;
        };

        const weeks = {};

        rows.forEach(row => {
            const dateObj = new Date(row.trans_date);
            const dateStr = dateObj.toISOString().split('T')[0];
            const weekLabel = getWeekRange(dateStr);
            const category = categoryMap[row.source_table] || 'Other Activity';

            if (!weeks[weekLabel]) {
                weeks[weekLabel] = { label: weekLabel, total_in: 0, total_out: 0, days: {} };
            }

            if (!weeks[weekLabel].days[dateStr]) {
                weeks[weekLabel].days[dateStr] = { 
                    label: dateStr, 
                    display_date: dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' }),
                    total_in: 0, 
                    total_out: 0, 
                    categories: {} 
                };
            }

            if (!weeks[weekLabel].days[dateStr].categories[category]) {
                weeks[weekLabel].days[dateStr].categories[category] = { 
                    label: category, 
                    total_in: 0, 
                    total_out: 0, 
                    transactions: [] 
                };
            }

            const amtIn = parseFloat(row.amount_in || 0);
            const amtOut = parseFloat(row.amount_out || 0);

            weeks[weekLabel].total_in += amtIn;
            weeks[weekLabel].total_out += amtOut;
            weeks[weekLabel].days[dateStr].total_in += amtIn;
            weeks[weekLabel].days[dateStr].total_out += amtOut;
            weeks[weekLabel].days[dateStr].categories[category].total_in += amtIn;
            weeks[weekLabel].days[dateStr].categories[category].total_out += amtOut;

            weeks[weekLabel].days[dateStr].categories[category].transactions.push({
                ...row,
                amount_in: amtIn.toFixed(2),
                amount_out: amtOut.toFixed(2),
                category_label: category,
                db_ref: `${row.source_table}:${row.source_id}`
            });
        });

        const finalReport = Object.values(weeks).map(w => ({
            ...w,
            total_in: w.total_in.toFixed(2),
            total_out: w.total_out.toFixed(2),
            net_flow: (w.total_in - w.total_out).toFixed(2),
            days: Object.values(w.days).length
        }));

        console.log('Final Report Summary:');
        console.table(finalReport);

        process.exit(0);
    } catch (err) {
        console.error('Test Failed:', err);
        process.exit(1);
    }
};

testCashFlowLogic();
