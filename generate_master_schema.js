const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, 'database');
const outputFile = path.join(__dirname, 'master_schema.sql');

async function generateMaster() {
    console.log("--- GENERATING MASTER SCHEMA ---");
    
    // 1. Get all SQL files starting with numbers
    const files = fs.readdirSync(dbDir)
        .filter(f => f.endsWith('.sql') && /^\d+/.test(f))
        .sort((a, b) => {
            const numA = parseInt(a.match(/^\d+/)[0]);
            const numB = parseInt(b.match(/^\d+/)[0]);
            return numA - numB;
        });

    let masterSql = `-- 🧱 DISTRIBUTION ERP MASTER SCHEMA\n`;
    masterSql += `-- Generated: ${new Date().toISOString()}\n\n`;

    // 2. Combine files
    for (const file of files) {
        console.log(`[Adding] ${file}...`);
        const content = fs.readFileSync(path.join(dbDir, file), 'utf8');
        masterSql += `\n-- 📄 FROM: ${file}\n`;
        masterSql += content + "\n";
    }

    // 3. Add Final Security Hardening (RLS & Invokers)
    masterSql += `\n-- 🛡️ FINAL SECURITY HARDENING (Applied in Latest Version)\n`;
    
    // Add the RLS enable commands for all 41 tables
    const rlsTables = [
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

    for (const t of rlsTables) {
        masterSql += `ALTER TABLE public."${t}" ENABLE ROW LEVEL SECURITY;\n`;
        masterSql += `DROP POLICY IF EXISTS "Enable all for authenticated" ON public."${t}";\n`;
        masterSql += `CREATE POLICY "Enable all for authenticated" ON public."${t}" FOR ALL TO authenticated USING (true) WITH CHECK (true);\n`;
    }

    const invokerViews = [
        'view_bank_statement_details', 'view_customer_advance_balance', 'view_advance_utilizations', 
        'view_customer_ledger', 'view_vendor_ledger', 'view_asset_entity_ledger', 
        'view_income_entity_ledger', 'view_expense_entity_ledger', 'view_employee_details'
    ];

    for (const v of invokerViews) {
        masterSql += `ALTER VIEW public."${v}" SET (security_invoker = on);\n`;
    }

    // 4. Write to file
    fs.writeFileSync(outputFile, masterSql);
    console.log(`--- MASTER SCHEMA GENERATED: ${outputFile} ---`);
}

generateMaster();
