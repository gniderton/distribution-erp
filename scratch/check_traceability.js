const { pool } = require('../config/db');

async function checkTraceability() {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT reference_type, transaction_type, COUNT(*) 
            FROM stock_traceability 
            WHERE reference_type IN ('Purchase Invoice', 'Debit Note', 'Purchase Invoice Reversal', 'Debit Note Reversal')
            GROUP BY reference_type, transaction_type
        `);
        
        console.log('--- Current Traceability Stats for Purchases/Debit Notes ---');
        if (result.rows.length === 0) {
            console.log('No logs found yet. (This is expected if no new transactions have been made since the patch).');
        } else {
            console.table(result.rows);
        }
    } catch (err) {
        console.error('Error checking traceability:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkTraceability();
