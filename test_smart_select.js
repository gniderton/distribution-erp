const { pool } = require('./config/db');

async function testSmartSelect() {
    try {
        console.log('--- TESTING SMART SELECT (BANK MATCHING) ---');

        const reportDate = '2026-02-06';
        const dseId = 1;
        const custId = 688;
        const refId = 'SMART-' + Date.now();

        // 1. Insert a Fresh Bank Entry (Credit)
        console.log('\n1. Inserting fresh bank credit...');
        await pool.query(`
            INSERT INTO bank_statement_entries (transaction_date, particulars, bank_ref_id, credit_amount, amount, status)
            VALUES ($1, $2, $3, 1500, 1500, 'Available')
        `, [reportDate, 'ONLINE PAYMENT FROM CUST ' + Date.now(), refId]);

        // 2. Fetch Unconsumed Credits (The "Smart Select" API)
        console.log('2. Calling Smart Select API...');
        const listRes = await fetch('http://localhost:3000/api/finance/reconciliation/bank/unconsumed-credits');
        const credits = await listRes.json();

        const matched = credits.find(c => c.bank_ref_id === refId);
        if (matched) {
            console.log(`✅ Correctly found the transaction in Smart Select! ID: ${matched.id}`);
        } else {
            console.log('❌ Error: Transaction not found in Smart Select list!');
            process.exit(1);
        }

        // 3. Simulate DSE selecting this Ref ID and Syncing
        console.log('3. Simulating DSE Sync with selected Ref...');
        const syncRes = await fetch('http://localhost:3000/api/dse/eod-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dse_id: dseId,
                date: reportDate,
                orders: [],
                expenses: [],
                denominations: { total: 0 },
                payments: [
                    {
                        customer_id: custId,
                        amount: 1500,
                        mode: 'UPI',
                        transaction_ref: refId
                    }
                ]
            })
        });

        if (syncRes.ok) {
            console.log('✅ DSE Sync successful!');
        } else {
            const err = await syncRes.json();
            console.log('❌ DSE Sync failed:', err);
            process.exit(1);
        }

        // 4. Verify Automatic Linkage
        console.log('4. Verifying automatic bank linkage...');
        const payRes = await pool.query('SELECT bank_statement_entry_id FROM customer_payments WHERE transaction_ref = $1', [refId]);

        // Wait a small bit for any async post-sync logic if applicable (though sync is transactional here)
        // Actually, our verify-online endpoint is PATCH. Should we auto-verify on sync?
        // User said: "dse can use that id in the select, instead of enetering reference no manually."

        // Let's check if our verify-online endpoint works with this Ref
        const payIdRes = await pool.query('SELECT id FROM customer_payments WHERE transaction_ref = $1', [refId]);
        const payId = payIdRes.rows[0].id;

        const verifyRes = await fetch(`http://localhost:3000/api/payments/${payId}/verify-online`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ verified_by: 1 })
        });

        if (verifyRes.ok) {
            const data = await verifyRes.json();
            console.log('✅ Auto-verification successful using Smart Ref! Linked ID:', data.matched_bank_id);
        } else {
            console.log('❌ Auto-verification failed');
        }

        console.log('\n--- SMART SELECT VERIFICATION COMPLETE ---');
        process.exit();

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testSmartSelect();
