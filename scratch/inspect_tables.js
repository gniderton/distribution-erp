const { pool } = require('../config/db');

async function run() {
    try {
        const tables = [
            'purchase_invoice_headers',
            'vendor_payments',
            'payment_allocations',
            'debit_notes',
            'debit_note_allocations'
        ];
        
        for (const t of tables) {
            console.log(`=== TABLE: ${t} ===`);
            const res = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = $1 
                ORDER BY ordinal_position
            `, [t]);
            console.table(res.rows);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
