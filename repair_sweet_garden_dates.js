
const { pool } = require('./config/db');

async function repairSweetGardenItems() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const newDate = '2026-04-03';

        // 1. Update Penalty Invoice
        const invUpdate = await client.query(`
            UPDATE sales_invoices 
            SET invoice_date = $1 
            WHERE invoice_number = 'PEN-26-00001'
        `, [newDate]);
        console.log(`Updated Penalty Invoice PEN-26-00001 to ${newDate}.`);

        // 2. Update Cheque Bounce (Ledger and Registry)
        // Cheque ID 49 is the specific 45,180.00 bounce
        const chqUpdate = await client.query(`
            UPDATE cheques 
            SET bounce_date = $1 
            WHERE id = 49 AND cheque_number = '567032'
        `, [newDate]);
        console.log(`Updated Cheque Bounce record (ID 49) to ${newDate}.`);

        const jeUpdate = await client.query(`
            UPDATE journal_entries 
            SET transaction_date = $1 
            WHERE reference_id = 49 AND reference_type IN ('CHQ_BOUNCE_REV', 'CHQ_BOUNCE_PENALTY')
        `, [newDate]);
        console.log(`Updated ${jeUpdate.rowCount} Journal Entries associated with Cheque 49.`);

        await client.query('COMMIT');
        console.log('✅ Sweet Garden date repair successful!');
        
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Repair failed:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

repairSweetGardenItems();
