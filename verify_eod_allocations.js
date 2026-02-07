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
        console.log("🚀 Testing EOD Sync with Dedicated Allocations...");
        const dseId = 1;
        const date = '2026-02-05';

        // 1. Submit EOD with Allocation to a VALID Invoice (ID 81)
        const res = await req('POST', '/api/dse/eod-sync', {
            dse_id: dseId,
            date: date,
            payments: [
                {
                    customer_id: 28,
                    amount: 1500,
                    mode: 'Cash',
                    invoice_id: 81 // Found via SELECT LIMIT 1
                }
            ]
        });

        console.log("Response Status:", res.status);
        if (res.status !== 200) {
            console.error("Sync Failed:", res.body);
            return;
        }

        // 2. Verify Allocation Table
        const allocRes = await pool.query(`
            SELECT a.*, p.payment_mode 
            FROM customer_payment_allocations a
            JOIN customer_payments p ON a.payment_id = p.id
            WHERE a.invoice_id = 81
            ORDER BY a.id DESC LIMIT 1
        `);

        if (allocRes.rows.length > 0 && Number(allocRes.rows[0].amount) === 1500) {
            console.log("✅ SUCCESS: Payment allocated to Sales Invoice in dedicated table.");
            console.table(allocRes.rows);
        } else {
            console.error("❌ FAILURE: Allocation not found.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
test();
