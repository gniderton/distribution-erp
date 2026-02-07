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
    let soId = null;
    let batchId = null;
    const pid = 101;

    try {
        console.log("🚀 Testing Invoice Rounding Logic...");
        const custId = 28;
        const dseId = 1;

        // 0. Setup Stock (Self-Contained)
        console.log("0️⃣ Setting up Stock...");
        // Ensure Product
        const pCheck = await pool.query('SELECT id FROM products WHERE id = $1', [pid]);
        if (pCheck.rows.length === 0) {
            await pool.query("INSERT INTO products (id, product_name, product_code, mrp, purchase_rate, tax_id) VALUES ($1, 'Test Rounding', 'TEST-R', 150, 80, 1)", [pid]);
        }

        // Inject Batch
        const batchRes = await pool.query(`
            INSERT INTO inventory_batches (product_id, batch_code, quantity_initial, quantity_remaining, purchase_rate, dealer_rate, mrp, is_active)
            VALUES ($1, $2, 1000, 1000, 100, 100.33, 150, true)
            RETURNING id
        `, [pid, `BATCH-ROUND-${Date.now()}`]);
        batchId = batchRes.rows[0].id;

        // 1. Create Order
        // Rate 100.33, Qty 2 = 200.66. Tax 0% (if tax_id 1 is 0%, let's checking tax_id 1 later, assume 0 for now or handle tax)
        // If tax_id 1 is 5%, then 200.66 + 5% = 210.693 => 211
        // Let's assume tax is 0 or handled.
        // To be safe, we rely on the backend calculation result.
        console.log("1️⃣ Creating Order (Qty 2 @ 100.33)...");
        const orderRes = await req('POST', '/api/sales/orders', {
            customer_id: custId, dse_id: dseId,
            items: [{ product_id: pid, qty: 2, rate: 100.33, tax_pct: 0 }] // Force 0% tax to isolate rounding
        });

        if (orderRes.status !== 201) {
            throw new Error(`Order Creation Failed: ${JSON.stringify(orderRes.body)}`);
        }
        soId = orderRes.body.id;
        console.log("   Order ID:", soId);

        // 2. Dispatch Order
        console.log("2️⃣ Dispatching Order...");
        const dispatchRes = await req('POST', `/api/sales/orders/${soId}/dispatch`, {
            invoice_date: new Date().toISOString()
        });

        if (dispatchRes.status !== 200) {
            throw new Error(`Dispatch Failed: ${JSON.stringify(dispatchRes.body)}`);
        }
        console.log("   Invoice Created:", dispatchRes.body.invoice_number);

        // 3. Verify Invoice
        const invRes = await pool.query('SELECT grand_total, round_off FROM sales_invoices WHERE sales_order_id = $1', [soId]);
        const inv = invRes.rows[0];
        console.log(`\n📊 Results:`);
        console.log(`   Expected Total: 211.00 (Assuming tax fallback applied)`);
        console.log(`   Actual Total:   ${inv.grand_total}`);
        console.log(`   Result Round Off: ${inv.round_off} (Expected 0.31)`);

        const total = Number(inv.grand_total);
        const round = Number(inv.round_off);

        if (total === 211 && Math.abs(round - 0.31) < 0.01) {
            console.log("\n✅ SUCCESS: Invoice Rounded Correctly.");
        } else {
            console.error("\n❌ FAILURE: Rounding Mismatch.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        console.log("\n🧹 Cleaning up...");
        if (soId) {
            await pool.query('DELETE FROM sales_invoices WHERE sales_order_id = $1', [soId]);
            await pool.query('DELETE FROM sales_orders WHERE id = $1', [soId]);
        }
        if (batchId) await pool.query('DELETE FROM inventory_batches WHERE id = $1', [batchId]);
        pool.end();
    }
}

test();
