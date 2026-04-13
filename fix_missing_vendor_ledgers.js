const { pool } = require('./config/db');

async function syncMissingVendorLedgers() {
    console.log("--- Starting Retroactive Vendor Payment Sync ---");
    
    // The schema audit confirmed reference_id is BIGINT. 
    // We must cast vp.id to BIGINT or vice versa correctly.
    const missingRes = await pool.query(`
        SELECT vp.* 
        FROM vendor_payments vp
        WHERE NOT EXISTS (
            SELECT 1 FROM journal_entries je 
            WHERE je.reference_type = 'PURCH_PAY' 
            AND je.reference_id = vp.id
        ) 
        AND vp.is_active = true 
        AND vp.transaction_ref != 'MIGRATION'
    `);

    console.log(`Found ${missingRes.rows.length} missing payments to sync.`);

    const acc_ap = 2001;
    const acc_bank = 1002;
    const acc_cash = 1003;
    const acc_cheque_issued = 2004;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const vp of missingRes.rows) {
            const normalizedMode = (vp.payment_mode || '').toUpperCase();
            const type = vp.transaction_type;
            const amount = parseFloat(vp.amount);
            const description = `${type === 'REFUND' ? 'Refund In' : 'Payment Out'}: ${vp.payment_number}`;

            let ledgerLines = [];
            if (type === 'PAYMENT' || type === 'DISBURSEMENT') {
                let targetAcc = acc_bank;
                if (normalizedMode === 'CHEQUE') targetAcc = acc_cheque_issued;
                if (normalizedMode === 'CASH') targetAcc = acc_cash;

                ledgerLines = [
                    { code: acc_ap, debit: amount, credit: 0 },
                    { code: targetAcc, debit: 0, credit: amount, bank_account_id: (normalizedMode === 'CHEQUE') ? null : vp.bank_account_id }
                ];
            } else {
                let targetAcc = (normalizedMode === 'CASH') ? acc_cash : acc_bank;
                ledgerLines = [
                    { code: targetAcc, debit: amount, credit: 0, bank_account_id: vp.bank_account_id },
                    { code: acc_ap, debit: 0, credit: amount }
                ];
            }

            console.log(`Syncing ID ${vp.id} (${vp.payment_number}) - Mode: ${normalizedMode} - Amount: ${amount}`);
            await client.query(`SELECT create_journal_entry($1, $2, $3, $4, $5)`, [
                vp.payment_date,
                description,
                'PURCH_PAY',
                vp.id.toString(), // The function create_journal_entry expects a string for reference_id and handles internal casting
                JSON.stringify(ledgerLines)
            ]);
        }

        await client.query('COMMIT');
        console.log("SUCCESS: All missing payments synced to Ledger.");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("FAILED to sync payments:", e.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

syncMissingVendorLedgers();
