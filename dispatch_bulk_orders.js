const { pool } = require('./config/db');
const https = require('https');

function dispatchOrder(id) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({});
        const options = {
            hostname: 'distribution-erp.onrender.com', // Update if local/different
            port: 443,
            path: `/api/sales/orders/${id}/dispatch`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                } else {
                    reject(body);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

async function run() {
    const client = await pool.connect();
    try {
        console.log('🚀 Dispatching Bulk Orders...');

        // 1. Get IDs of Bulk Orders
        console.log("Running query for SO-BULK-V2-...");
        const res = await client.query("SELECT id, so_number, status FROM sales_orders WHERE so_number LIKE 'SO-BULK-V2-%' ORDER BY id");
        console.log("Rows returned:", res.rows);
        const orders = res.rows;

        if (orders.length === 0) {
            console.log('No confirmed bulk orders found.');
            return;
        }

        console.log(`Found ${orders.length} orders to dispatch.`);

        const successIds = [];

        // 2. Dispatch Each
        for (const order of orders) {
            try {
                process.stdout.write(`Dispatching ${order.so_number} (ID: ${order.id})... `);
                await dispatchOrder(order.id);
                console.log('✅ Done');
                successIds.push(order.id);
            } catch (err) {
                console.log('❌ Failed', err);
            }
        }

        // 3. Verify Invoice Structure (Merged Lines)
        if (successIds.length > 0) {
            console.log('\n🔍 Verifying Invoice Structure (Checking for Merged Lines)...');
            const sampleId = successIds[0];

            // Get Invoice ID from Order ID
            const invRes = await client.query("SELECT id, invoice_number FROM sales_invoices WHERE sales_order_id = $1", [sampleId]);
            const invId = invRes.rows[0].id;

            // Get Lines
            const linesRes = await client.query(`
                SELECT product_id, shipped_qty, gross_amount, scheme_amount, taxable_amount 
                FROM sales_invoice_lines 
                WHERE invoice_id = $1
            `, [invId]);

            console.table(linesRes.rows);
            console.log('NOTE: If you see 1 line per product with non-zero scheme_amount, the merge worked!');
        }

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}

run();
