const { pool } = require('../config/db');

async function findMissingLogs() {
    const client = await pool.connect();
    try {
        console.log('--- Checking for Missing Historical Logs ---');

        // 1. Missing GRN (IN) Logs
        const missingGrns = await client.query(`
            SELECT COUNT(*) 
            FROM inventory_batches ib
            LEFT JOIN stock_traceability st ON st.batch_id = ib.id AND st.transaction_type = 'IN'
            WHERE ib.grn_id IS NOT NULL AND st.id IS NULL
        `);
        console.log(`Missing GRN (IN) entries: ${missingGrns.rows[0].count}`);

        // 2. Missing Debit Note (OUT) Logs
        const missingDebits = await client.query(`
            SELECT COUNT(*) 
            FROM debit_note_lines dnl
            JOIN debit_notes dn ON dnl.debit_note_id = dn.id
            LEFT JOIN stock_traceability st ON st.reference_id = dn.id AND st.product_id = dnl.product_id AND st.transaction_type = 'OUT'
            WHERE dn.status != 'Cancelled' AND dn.status != 'Reversed' AND st.id IS NULL
        `);
        console.log(`Missing Debit Note (OUT) entries: ${missingDebits.rows[0].count}`);

    } catch (err) {
        console.error('Error finding missing logs:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

findMissingLogs();
