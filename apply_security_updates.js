const { pool } = require('./config/db');

async function applySecurity() {
    const client = await pool.connect();
    try {
        console.log("--- STARTING SECURITY MIGRATION ---");
        await client.query('BEGIN');

        // 1. Add policies to RLS-enabled tables
        const tables = [
            'customer_payments', 'sales_orders', 'sales_returns', 'trip_stops', 'sales_invoices', 
            'bank_accounts', 'sales_invoice_lines', 'customer_visits', 'delivery_trips', 
            'customer_brand_pricing', 'sales_order_lines', 'channels', 'vehicles', 
            'vendor_payments', 'purchase_invoice_headers', 'product_batches'
        ];

        for (const table of tables) {
            console.log(`[Policy] Adding SELECT policy to public.${table}...`);
            await client.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_policies 
                        WHERE tablename = '${table}' AND policyname = 'Allow Read for Authenticated'
                    ) THEN
                        CREATE POLICY "Allow Read for Authenticated" ON public."${table}" 
                        FOR SELECT TO authenticated USING (true);
                    END IF;
                END $$;
            `);
        }

        // 2. Toggle Views to SECURITY INVOKER
        const views = [
            'view_bank_statement_details', 'view_customer_advance_balance', 'view_advance_utilizations', 
            'view_customer_ledger', 'view_vendor_ledger', 'view_asset_entity_ledger', 
            'view_income_entity_ledger', 'view_expense_entity_ledger', 'view_employee_details'
        ];

        for (const view of views) {
            console.log(`[View] Switching public.${view} to SECURITY INVOKER...`);
            await client.query(`ALTER VIEW public."${view}" SET (security_invoker = on)`);
        }

        await client.query('COMMIT');
        console.log("--- MIGRATION COMPLETED SUCCESSFULLY ---");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Migration Failed:", err);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

applySecurity();
