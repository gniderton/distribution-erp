const { pool } = require('./config/db');

async function hardenRLS() {
    const client = await pool.connect();
    try {
        console.log("--- STARTING RLS HARDENING (41 TABLES) ---");
        
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
            console.log(`[Hardening] ${table}...`);
            await client.query(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;`);
            await client.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_policies 
                        WHERE tablename = '${table}' AND policyname = 'Enable all for authenticated'
                    ) THEN
                        CREATE POLICY "Enable all for authenticated" ON public."${table}" 
                        FOR ALL TO authenticated USING (true) WITH CHECK (true);
                    END IF;
                END $$;
            `);
        }

        console.log("--- RLS HARDENING COMPLETED SUCCESSFULLY ---");
    } catch (err) {
        console.error("Hardening Failed:", err);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

hardenRLS();
