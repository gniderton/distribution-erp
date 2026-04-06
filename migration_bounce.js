const { pool } = require('./config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Adding columns to cheques and sales_invoices...");

        // 1. Add bounce_date to cheques
        await client.query(`
            ALTER TABLE cheques ADD COLUMN IF NOT EXISTS bounce_date date;
        `);

        // 2. Add description and created_by to sales_invoices
        await client.query(`
            ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS description text;
            ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS created_by bigint;
        `);

        // 3. Backfill bounce_date for existing bounced cheques
        await client.query(`
            UPDATE cheques SET bounce_date = updated_at::date 
            WHERE status = 'BOUNCED' AND bounce_date IS NULL;
        `);

        await client.query('COMMIT');
        console.log("✅ Migration successful.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Migration failed:", err);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();

