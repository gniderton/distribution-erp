const { pool } = require('./config/db');
const { calculateFreeItems } = require('./utils/schemeEngine');

async function testInvoice(orderId) {
    const client = await pool.connect();
    try {
        console.log(`Starting test for Order ID: ${orderId}`);
        await client.query('BEGIN');

        // 1. Fetch Order
        const soRes = await client.query('SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE', [orderId]);
        if (soRes.rows.length === 0) throw new Error(`Order ${orderId} not found`);
        const so = soRes.rows[0];
        console.log(`Found Order: ${so.so_number}`);

        const linesRes = await client.query('SELECT * FROM sales_order_lines WHERE sales_order_id = $1', [orderId]);
        let lines = linesRes.rows;
        console.log(`Found ${lines.length} lines`);

        // 1.5 SCHEME LOGIC
        const orderedItems = lines.map(l => ({ product_id: l.product_id, qty: l.ordered_qty }));
        const freeItems = await calculateFreeItems(orderedItems, client);
        console.log(`Calculated ${freeItems.length} free items`);

        for (const free of freeItems) {
            const resFree = await client.query(`
                INSERT INTO sales_order_lines(sales_order_id, product_id, ordered_qty, rate, tax_percent, tax_amount, amount, tier_applied)
                VALUES($1, $2, $3, 0, 0, 0, 0, 'Scheme: ' || $4)
                RETURNING *
            `, [orderId, free.product_id, free.qty, free.reason]);
            lines.push(resFree.rows[0]);
        }

        // 2. Pricing Tiers
        const custTierRes = await client.query(`
            SELECT c.price_column 
            FROM channels c 
            JOIN customers cust ON cust.channel_id = c.id 
            WHERE cust.id = $1
        `, [so.customer_id]);
        const defaultRateColumn = custTierRes.rows[0]?.price_column || 'dealer_rate';
        console.log(`Default Rate Column: ${defaultRateColumn}`);

        const overridesRes = await client.query(`
            SELECT b.brand_id, ch.price_column 
            FROM customer_brand_pricing b
            JOIN channels ch ON b.channel_id = ch.id
            WHERE b.customer_id = $1
        `, [so.customer_id]);
        const overrideMap = {};
        overridesRes.rows.forEach(r => overrideMap[r.brand_id] = r.price_column);

        // 3. Create Invoice Header
        const yy = new Date().getFullYear().toString().slice(-2);
        let nextSeq = 1;
        const seqRes = await client.query("SELECT COUNT(*) FROM sales_invoices WHERE invoice_number LIKE $1 OR invoice_number LIKE $2", [`INV-${yy}-%`, `INV - ${yy} -%`]);
        nextSeq = parseInt(seqRes.rows[0].count) + 1;

        let invNumber;
        let check;
        do {
            invNumber = `INV-${yy}-${String(nextSeq).padStart(4, '0')}`;
            check = await client.query("SELECT id FROM sales_invoices WHERE invoice_number = $1", [invNumber]);
            if (check.rows.length > 0) nextSeq++;
        } while (check.rows.length > 0);
        console.log(`Generated Invoice Number: ${invNumber}`);

        const invHeadRes = await client.query(`
            INSERT INTO sales_invoices(invoice_number, sales_order_id, customer_id, status, grand_total, invoice_date)
            VALUES($1, $2, $3, 'Unpaid', 0, NOW()) RETURNING id
        `, [invNumber, orderId, so.customer_id]);
        const invId = invHeadRes.rows[0].id;
        console.log(`Invoice ID created: ${invId}`);

        let invTotal = 0;
        let invTax = 0;
        let totalCOGS = 0;

        // 4. Stock Allocation
        for (const line of lines) {
            const orderedQty = Number(line.ordered_qty);
            let qtyToFulfill = orderedQty;
            const pid = String(line.product_id);

            const prodInfo = await client.query('SELECT brand_id, tax_id FROM products WHERE id = $1', [pid]);
            const brandId = prodInfo.rows[0]?.brand_id;
            const rateColumn = overrideMap[brandId] || defaultRateColumn;
            const lineTaxPercent = Number(line.tax_percent) || 0;

            console.log(`Processing Product ${pid} (Column: ${rateColumn})`);

            const batchesRes = await client.query(`
                SELECT id, quantity_remaining, mrp, purchase_rate,
                       distributor_rate, wholesale_rate, dealer_rate, retail_rate
                FROM inventory_batches 
                WHERE product_id = $1 AND quantity_remaining > 0 AND is_active = true
                ORDER BY created_at ASC FOR UPDATE
            `, [pid]);

            for (const batch of batchesRes.rows) {
                if (qtyToFulfill <= 0) break;
                const take = Math.min(qtyToFulfill, batch.quantity_remaining);
                const batchRate = Number(batch[rateColumn]) || 0;

                await client.query('UPDATE inventory_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2', [take, batch.id]);

                await client.query(`
                    INSERT INTO stock_traceability (batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type, notes)
                    VALUES ($1, $2, $3, 'OUT', $4, 'Sales Invoice', $5)
                `, [batch.id, pid, -take, invId, `Real stock for ${invNumber} (${rateColumn})`]);

                const chunkAmount = (batchRate * take) * (1 + (lineTaxPercent / 100));
                const chunkTax = chunkAmount - (batchRate * take);

                await client.query(`
                    INSERT INTO sales_invoice_lines (invoice_id, product_id, shipped_qty, rate, tax_percent, tax_amount, amount)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [invId, pid, take, batchRate, lineTaxPercent, chunkTax, chunkAmount]);

                invTotal += chunkAmount;
                invTax += chunkTax;
                totalCOGS += (Number(batch.purchase_rate) || 0) * take;
                qtyToFulfill -= take;
            }
        }

        if (invTotal === 0) throw new Error("Zero stock available.");

        const roundedTotal = Number(invTotal.toFixed(2));
        const roundedTax = Number(invTax.toFixed(2));
        const taxable = Number((roundedTotal - roundedTax).toFixed(2));
        const cgst = Number((roundedTax / 2).toFixed(2));
        const sgst = Number((roundedTax - cgst).toFixed(2));

        console.log(`Totals: Total=${roundedTotal}, Tax=${roundedTax}, Taxable=${taxable}, CGST=${cgst}, SGST=${sgst}`);

        await client.query('UPDATE sales_invoices SET grand_total = $1, total_taxable = $2, total_cgst = $3, total_sgst = $4 WHERE id = $5', [roundedTotal, taxable, cgst, sgst, invId]);

        // Accounting Integraton
        const acc_revenue = 4001;
        const acc_ar = 1101;
        const acc_gst_cgst = 2011;
        const acc_gst_sgst = 2012;
        const acc_cogs = 5001;
        const acc_inventory = 1001;

        let invoiceLines = [
            { code: acc_ar, debit: roundedTotal, credit: 0 },
            { code: acc_revenue, debit: 0, credit: taxable }
        ];
        if (roundedTax > 0) {
            invoiceLines.push({ code: acc_gst_cgst, debit: 0, credit: cgst });
            invoiceLines.push({ code: acc_gst_sgst, debit: 0, credit: sgst });
        }

        console.log("Creating Sales Journal Entry...");
        await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)',
            [new Date(), `Sales Invoice: ${invNumber}`, 'SALES_INV', invId, JSON.stringify(invoiceLines)]);

        if (totalCOGS > 0) {
            const roundedCOGS = Number(totalCOGS.toFixed(2));
            const cogsLines = [
                { code: acc_cogs, debit: roundedCOGS, credit: 0 },
                { code: acc_inventory, debit: 0, credit: roundedCOGS }
            ];
            console.log("Creating COGS Journal Entry...");
            await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)',
                [new Date(), `COGS for ${invNumber}`, 'COGS', invId, JSON.stringify(cogsLines)]);
        }

        await client.query("UPDATE sales_orders SET status = 'Invoiced' WHERE id = $1", [orderId]);

        await client.query('COMMIT');
        console.log("SUCCESS! Invoice generated and committed.");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("TEST FAILED:", err);
    } finally {
        client.release();
    }
}

testInvoice(12).then(() => process.exit());
