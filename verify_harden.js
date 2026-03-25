const { pool } = require('./config/db');

async function verifyHarden() {
    console.log("--- FINAL RLS VERIFICATION ---");
    const tables = [
        'company_settings', 'daily_sales_reports', 'expense_entities', 'customer_advances', 
        'chart_of_accounts', 'journal_entries', 'designations', 'asset_entities', 
        'advance_utilizations', 'loan_entities', 'schemes', 'inventory_batches', 
        'route_types', 'stock_adjustments', 'dse_expenses', 'cash_denominations', 
        'trip_invoices', 'trip_returns', 'sync_logs', 'customer_payment_allocations', 
        'expenses', 'delivery_teams', 'employee_attendance', 'income_entities', 
        'scheme_combo_products', 'scheme_rules', 'employee_advances', 'bank_statement_entries', 
        'journal_lines', 'employee_salaries', 'cheques', 'vendor_penalties', 
        'asset_transactions', 'other_income', 'internal_transfers', 'assets', 
        'loans', 'loan_transactions', 'income_penalties', 'expense_penalties', 'employee_bonuses'
    ];

    for (const table of tables) {
        try {
            // Check RLS status
            const rlsRes = await pool.query(`SELECT rowsecurity FROM pg_tables WHERE tablename = $1`, [table]);
            const isRls = rlsRes.rows[0]?.rowsecurity;

            // Check Policy
            const polRes = await pool.query(`SELECT count(*) FROM pg_policies WHERE tablename = $1`, [table]);
            const polCount = polRes.rows[0]?.count;

            console.log(`[OK] ${table}: RLS=${isRls}, Policies=${polCount}`);
        } catch (err) {
            console.error(`[FAIL] ${table}: ${err.message}`);
        }
    }
    process.exit(0);
}

verifyHarden();
