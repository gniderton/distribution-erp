const { Pool } = require('pg');
const pool = new Pool({
    connectionString: "postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable",
    ssl: { rejectUnauthorized: false }
});

async function backfill() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('--- Starting Backfill ---');

        // 1. Sales Orders
        const soRes = await client.query(`
            UPDATE sales_orders so
            SET report_id = dsr.id, sync_id = dsr.sync_id
            FROM daily_sales_reports dsr
            WHERE so.dse_id = dsr.dse_id AND so.order_date = dsr.report_date
              AND so.report_id IS NULL
            RETURNING so.id
        `);
        console.log(`Updated ${soRes.rows.length} sales_orders`);

        // 2. Customer Payments
        const cpRes = await client.query(`
            UPDATE customer_payments cp
            SET report_id = dsr.id, sync_id = dsr.sync_id
            FROM daily_sales_reports dsr
            WHERE cp.collected_by = dsr.dse_id AND cp.payment_date = dsr.report_date
              AND cp.report_id IS NULL
            RETURNING cp.id
        `);
        console.log(`Updated ${cpRes.rows.length} customer_payments`);

        // 3. DSE Expenses
        const deRes = await client.query(`
            UPDATE dse_expenses de
            SET report_id = dsr.id, sync_id = dsr.sync_id
            FROM daily_sales_reports dsr
            WHERE de.dse_id = dsr.dse_id AND de.expense_date = dsr.report_date
              AND de.report_id IS NULL
            RETURNING de.id
        `);
        console.log(`Updated ${deRes.rows.length} dse_expenses`);

        // 4. Cash Denominations
        const cdRes = await client.query(`
            UPDATE cash_denominations cd
            SET report_id = dsr.id, sync_id = dsr.sync_id
            FROM daily_sales_reports dsr
            WHERE cd.dse_id = dsr.dse_id AND cd.report_date = dsr.report_date
              AND cd.report_id IS NULL
            RETURNING cd.id
        `);
        console.log(`Updated ${cdRes.rows.length} cash_denominations`);

        await client.query('COMMIT');
        console.log('--- Backfill Completed Successfully ---');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Backfill Failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

backfill();
