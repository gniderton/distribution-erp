const { pool } = require('../config/db');

async function run() {
    const client = await pool.connect();
    try {
        const tables = [
            'sales_invoices',
            'purchase_invoice_headers',
            'inventory_batches',
            'loans',
            'assets',
            'bank_accounts'
        ];
        
        for (const table of tables) {
            console.log(`\n=== COLUMNS FOR ${table} ===`);
            const res = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '${table}'
                AND table_schema = 'public'
            `);
            console.table(res.rows);
        }

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit();
    }
}
run();
