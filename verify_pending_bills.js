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
    let invoiceId = null;
    try {
        console.log("🚀 Testing Pending Bills API...");
        const custId = 28; // Test Customer

        // 1. Seed Dummy Invoice
        console.log("🌱 Seeding dummy invoice...");
        const seedRes = await pool.query(`
            INSERT INTO sales_invoices (invoice_number, customer_id, grand_total, paid_amount, amount_paid, status)
            VALUES ('TEST-PENDING-001', $1, 5000, 0, 0, 'Unpaid')
            RETURNING id
        `, [custId]);
        invoiceId = seedRes.rows[0].id;

        // 2. Call API
        const res = await req('GET', `/api/customers/${custId}/pending-bills`);
        console.log("Status:", res.status);
        console.log("Pending Bills:", JSON.stringify(res.body, null, 2));

        // 3. Verify
        const found = res.body.find(i => i.id === invoiceId);
        if (found) {
            console.log("✅ SUCCESS: Found created pending bill.");
        } else {
            console.error("❌ FAILURE: Created bill not found.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        if (invoiceId) {
            console.log("🧹 Cleaning up...");
            await pool.query('DELETE FROM sales_invoices WHERE id = $1', [invoiceId]);
        }
        pool.end();
    }
}

test();
