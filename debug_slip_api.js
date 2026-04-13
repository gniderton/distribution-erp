const { pool } = require('./config/db');

async function testQuery(paymentId) {
    try {
        console.log(`--- Testing Slip Details Query for ID: ${paymentId} ---`);
        
        const res = await pool.query(`
            SELECT 
                vp.id,
                vp.payment_number,
                vp.payment_date,
                vp.amount,
                vp.payment_mode,
                vp.transaction_ref as manual_ref,
                vp.remarks,
                v.vendor_name,
                v.vendor_code,
                v.gst as vendor_gst,
                v.pan as vendor_pan,
                va.address_line as vendor_address,
                va.city as vendor_city,
                ba.bank_name as bank_name,
                bse.bank_ref_id as stmt_ref
            FROM vendor_payments vp
            JOIN vendors v ON vp.vendor_id = v.id
            LEFT JOIN vendor_addresses va ON v.id = va.vendor_id 
            LEFT JOIN bank_accounts ba ON vp.bank_account_id = ba.id
            LEFT JOIN bank_statement_entries bse ON vp.bank_statement_entry_id = bse.id
            WHERE vp.id = $1
            LIMIT 1
        `, [paymentId]);

        console.log('SUCCESS:', res.rows[0]);
    } catch (e) {
        console.error('--- QUERY FAILED ---');
        console.error('Message:', e.message);
        console.error('Detail:', e.detail || 'None');
        console.error('Hint:', e.hint || 'None');
    } finally {
        await pool.end();
    }
}

testQuery(17);
