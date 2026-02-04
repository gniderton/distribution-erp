const { pool } = require('./config/db');

async function testMrpSplit() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("🚀 Starting MRP Split Verification...");

        // Ensure Master Data
        const v = await client.query("INSERT INTO vendors (vendor_name, vendor_code) VALUES ('MRP Vendor', 'V-MRP') ON CONFLICT DO NOTHING RETURNING id");
        const b = await client.query("INSERT INTO brands (brand_name) VALUES ('MRP Brand') ON CONFLICT DO NOTHING RETURNING id");
        const c = await client.query("INSERT INTO categories (category_name) VALUES ('MRP Cat') ON CONFLICT DO NOTHING RETURNING id");

        const vid = v.rows[0]?.id || 1;
        const bid = b.rows[0]?.id || 1;
        const cid = c.rows[0]?.id || 1;

        // 1. Create a Test Product
        const pRes = await client.query(`
            INSERT INTO products (product_name, product_code, mrp, purchase_rate, dealer_rate, brand_id, category_id, vendor_id)
            VALUES ('MRP Split Test', 'MRP-TEST-' || extract(epoch from now()), 100, 50, 80, $1, $2, $3) RETURNING id
        `, [bid, cid, vid]);
        const pid = pRes.rows[0].id;

        // 2. Add two batches with DIFFERENT MRPs
        await client.query(`
            INSERT INTO inventory_batches (product_id, batch_code, mrp, purchase_rate, dealer_rate, quantity_initial, quantity_remaining, is_active)
            VALUES ($1, 'BATCH-100', 100, 50, 80, 5, 5, true)
        `, [pid]);

        await client.query(`
            INSERT INTO inventory_batches (product_id, batch_code, mrp, purchase_rate, dealer_rate, quantity_initial, quantity_remaining, is_active)
            VALUES ($1, 'BATCH-110', 110, 55, 90, 10, 10, true)
        `, [pid]);

        // 3. Create an Order for 12 units
        const soRes = await client.query(`
            INSERT INTO sales_orders (so_number, customer_id, dse_id, order_date, status)
            VALUES ('SO-MRP-' || extract(epoch from now()), 1, 1, CURRENT_DATE, 'Confirmed') RETURNING id
        `);
        const soId = soRes.rows[0].id;

        await client.query(`
            INSERT INTO sales_order_lines (sales_order_id, product_id, ordered_qty, rate, tax_percent, amount)
            VALUES ($1, $2, 12, 80, 18, 1132.80)
        `, [soId, pid]);

        console.log(`📋 Order Created [ID: ${soId}] for 12 units.`);

        // 4. Simulate Refactored Dispatch Logic
        console.log("🏃 Running MRP-Aware Dispatch Logic...");

        const invNumber = 'INV-MRP-TEST';
        const invHeadRes = await client.query(`
            INSERT INTO sales_invoices (invoice_number, sales_order_id, customer_id, invoice_date, status, grand_total)
            VALUES ($1, $2, 1, CURRENT_DATE, 'Unpaid', 0) RETURNING id
        `, [invNumber, soId]);
        const invId = invHeadRes.rows[0].id;

        const totalToShip = 12;
        const rateColumn = 'dealer_rate';
        const taxPct = 18;

        const mrpGroups = {};
        const batches = await client.query(`
            SELECT * FROM inventory_batches WHERE product_id = $1 AND quantity_remaining > 0 AND is_active = true ORDER BY created_at ASC FOR UPDATE
        `, [pid]);

        let qtyToFulfill = totalToShip;
        for (const batch of batches.rows) {
            if (qtyToFulfill <= 0) break;
            const take = Math.min(qtyToFulfill, batch.quantity_remaining);
            const unitRate = Number(batch[rateColumn]) || 0;
            const batchMrp = Number(batch.mrp || 0);

            if (!mrpGroups[batchMrp]) mrpGroups[batchMrp] = { qty: 0, gross: 0, cogs: 0, slabDeduction: 0 };

            await client.query('UPDATE inventory_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2', [take, batch.id]);
            mrpGroups[batchMrp].qty += take;
            mrpGroups[batchMrp].gross += (take * unitRate);
            qtyToFulfill -= take;
        }

        for (const [mrpVal, group] of Object.entries(mrpGroups)) {
            const groupAvgRate = group.gross / group.qty;
            const lineScheme = 0;
            const taxableValue = group.gross - lineScheme;
            const taxValue = taxableValue * (taxPct / 100);
            const netValue = taxableValue + taxValue;

            await client.query(`
                INSERT INTO sales_invoice_lines (
                    invoice_id, product_id, shipped_qty, rate, mrp,
                    gross_amount, scheme_amount, taxable_amount, tax_percent, tax_amount, amount
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [invId, pid, group.qty, groupAvgRate, mrpVal, group.gross, lineScheme, taxableValue, taxPct, taxValue, netValue]);
        }

        // 5. Verify Results
        const linesRes = await client.query(`SELECT * FROM sales_invoice_lines WHERE invoice_id = $1`, [invId]);
        console.log(`\n📊 Invoice Lines Generated: ${linesRes.rows.length}`);

        linesRes.rows.forEach((l, i) => {
            console.log(`Line ${i + 1}: Qty ${l.shipped_qty}, Rate ${l.rate}, MRP ${l.mrp}, Amount ${l.amount}`);
        });

        if (linesRes.rows.length === 2) {
            console.log("\n✅ SUCCESS: Invoice correctly split into two lines for different MRPs!");
        } else {
            console.log("\n❌ FAILURE: Invoice should have had 2 lines but has " + linesRes.rows.length);
        }

        await client.query('ROLLBACK');
        console.log("🧹 Test Data Rolled Back.");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Test Failed:", err);
    } finally {
        client.release();
        process.exit();
    }
}

testMrpSplit();
