const { Pool } = require('pg');
const pool = new Pool({
    connectionString: "postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable",
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const tables = ['sales_orders', 'customer_payments', 'dse_expenses', 'cash_denominations'];
        const stats = [];
        for (const table of tables) {
            const reportNullRes = await pool.query(`SELECT COUNT(*) FROM ${table} WHERE report_id IS NULL`);
            const syncNullRes = await pool.query(`SELECT COUNT(*) FROM ${table} WHERE sync_id IS NULL`);
            stats.push({
                table,
                report_id_nulls: reportNullRes.rows[0].count,
                sync_id_nulls: syncNullRes.rows[0].count
            });
        }
        console.log(JSON.stringify(stats, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
