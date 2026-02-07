const http = require('http');
const { pool } = require('./config/db');

function req(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function test() {
    try {
        console.log("🚀 Testing EOD Sync with Payment Details...");
        const dseId = 1;
        const date = '2026-02-05';

        // 1. Submit EOD with Detailed Payment
        const res = await req('POST', '/api/dse/eod-sync', {
            dse_id: dseId,
            date: date,
            payments: [
                {
                    customer_id: 28,
                    amount: 2500,
                    mode: 'Cheque',
                    bank_name: 'SBI',
                    transaction_ref: 'CHQ-999',
                    cheque_date: '2026-02-10'
                },
                {
                    customer_id: 28,
                    amount: 500,
                    mode: 'UPI',
                    transaction_ref: 'UTR-12345',
                    deposit_bank: 'HDFC'
                }
            ]
        });

        console.log("Response:", res.body);

        // 2. Verify DB
        const payRes = await pool.query('SELECT * FROM customer_payments WHERE collected_by = $1 AND payment_date = $2 ORDER BY amount DESC', [dseId, date]);
        console.table(payRes.rows.map(r => ({
            amt: r.amount, mode: r.payment_mode, ref: r.transaction_ref, bank: r.bank_name, dep: r.deposit_bank
        })));

        if (payRes.rows.length >= 2) {
            console.log("✅ SUCCESS: Payment details saved.");
        } else {
            console.error("❌ FAILURE: Payments not found.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
test();
