const { pool } = require('./config/db');

async function testAllocation() {
    console.log("--- Starting CN Allocation Test (LIFO) ---");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Setup Test Customer
        const custRes = await client.query("INSERT INTO customers (customer_name) VALUES ('Test LIFO Customer') RETURNING id");
        const cid = custRes.rows[0].id;

        // 2. Setup 3 Invoices (Old to New)
        // Inv 1 (Oldest)
        const inv1Res = await client.query(`
            INSERT INTO sales_invoices (invoice_number, sales_order_id, customer_id, invoice_date, grand_total, status)
            VALUES ('INV-OLD-1', 1, $1, '2026-01-01', 500, 'Unpaid') RETURNING id
        `, [cid]);
        const i1 = inv1Res.rows[0].id;

        // Inv 2 (Middle)
        const inv2Res = await client.query(`
            INSERT INTO sales_invoices (invoice_number, sales_order_id, customer_id, invoice_date, grand_total, status)
            VALUES ('INV-MID-2', 1, $1, '2026-02-01', 500, 'Unpaid') RETURNING id
        `, [cid]);
        const i2 = inv2Res.rows[0].id;

        // Inv 3 (Newest)
        const inv3Res = await client.query(`
            INSERT INTO sales_invoices (invoice_number, sales_order_id, customer_id, invoice_date, grand_total, status)
            VALUES ('INV-NEW-3', 1, $1, '2026-03-01', 500, 'Unpaid') RETURNING id
        `, [cid]);
        const i3 = inv3Res.rows[0].id;

        console.log(`Setup 3 Invoices for Customer ${cid}: Old(${i1}), Mid(${i2}), New(${i3})`);

        // 3. Scenario: Manual CN for 800 rs linked to OLD (i1)
        // Expectation: i1 gets 500 (full), remaining 300 goes to i3 (LIFO newest)
        const grandTotal = 800;
        const linkedInvoiceId = i1;
        let remainingToAllocate = grandTotal;

        console.log(`\nAllocating 800 rs (Linked to Old Bill ${i1})...`);

        // A. Priority: Linked Invoice
        const invRes = await client.query(`
            SELECT id, grand_total - COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = sales_invoices.id), 0) as balance
            FROM sales_invoices WHERE id = $1
        `, [linkedInvoiceId]);
        
        if (invRes.rows.length > 0) {
            const balance = Number(invRes.rows[0].balance);
            const alloc = Math.min(balance, remainingToAllocate);
            if (alloc > 0) {
                console.log(`- Allocated ${alloc} to Priority Invoice ${linkedInvoiceId}`);
                await client.query(`
                    INSERT INTO customer_payment_allocations (invoice_id, amount, allocated_at)
                    VALUES ($1, $2, NOW())
                `, [linkedInvoiceId, alloc]);
                remainingToAllocate -= alloc;
            }
        }

        // B. Spillover: LIFO (Newest First)
        if (remainingToAllocate > 0) {
            const pendingRes = await client.query(`
                SELECT id, invoice_number, (grand_total - COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = sales_invoices.id), 0)) as balance
                FROM sales_invoices
                WHERE customer_id = $1 AND status != 'Cancelled'
                AND (grand_total - COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = sales_invoices.id), 0)) > 0
                AND id != $2
                ORDER BY invoice_date DESC, created_at DESC
            `, [cid, linkedInvoiceId]);

            for (const inv of pendingRes.rows) {
                if (remainingToAllocate <= 0.01) break;
                const alloc = Math.min(Number(inv.balance), remainingToAllocate);
                console.log(`- Spillover: Allocated ${alloc} to Invoice ${inv.invoice_number} (${inv.id})`);
                await client.query(`
                    INSERT INTO customer_payment_allocations (invoice_id, amount, allocated_at)
                    VALUES ($1, $2, NOW())
                `, [inv.id, alloc]);
                remainingToAllocate -= alloc;
            }
        }

        console.log(`Remaining to allocate: ${remainingToAllocate}`);

        // 4. Verify Results
        const finalRes = await client.query(`
            SELECT id, invoice_number, 
                   (SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id) as total_paid
            FROM sales_invoices si WHERE customer_id = $1 ORDER BY id
        `, [cid]);

        console.table(finalRes.rows);

        // Check if i1 has 500 and i3 has 300
        const row1 = finalRes.rows.find(r => r.id == i1);
        const row3 = finalRes.rows.find(r => r.id == i3);
        const row2 = finalRes.rows.find(r => r.id == i2);

        if (row1.total_paid == 500 && row3.total_paid == 300 && !row2.total_paid) {
            console.log("\n✅ SUCCESS: LIFO Allocation verified!");
        } else {
            console.error("\n❌ FAILED: Unexpected allocation results.");
        }

        await client.query('ROLLBACK'); // Don't commit test data
        process.exit(0);

    } catch (err) {
        console.error(err);
        await client.query('ROLLBACK');
        process.exit(1);
    } finally {
        client.release();
    }
}

testAllocation();
