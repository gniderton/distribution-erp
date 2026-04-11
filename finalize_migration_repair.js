const { pool } = require('./config/db');

async function repair() {
    console.log("🚀 Starting Final Migration Data Repair...");
    const client = await pool.connect();

    const actualLosses = [
        { id: 109, amt: 1000 }, { id: 111, amt: 2500 }, { id: 120, amt: 1000 },
        { id: 123, amt: 2000 }, { id: 125, amt: 400 }, { id: 127, amt: 1600 },
        { id: 132, amt: 170 }, { id: 135, amt: 2544 }, { id: 140, amt: 3007 },
        { id: 117, amt: 63 }, { id: 137, amt: 3064 }, { id: 63, amt: 89 },
        { id: 64, amt: 500 }, { id: 35, amt: 76 }, { id: 69, amt: 2510 },
        { id: 70, amt: 1391 }, { id: 77, amt: 250 }, { id: 85, amt: 25339 },
        { id: 92, amt: 2038 }, { id: 95, amt: 3419 }, { id: 50, amt: 61 },
        { id: 49, amt: 196 }, { id: 456, amt: 363 }, { id: 374, amt: 189 },
        { id: 205, amt: 677 }, { id: 207, amt: 4000 }, { id: 401, amt: 650 },
        { id: 403, amt: 1500 }, { id: 427, amt: 300 }, { id: 423, amt: 200 },
        { id: 462, amt: 39 }, { id: 493, amt: 4080 }, { id: 530, amt: 628 },
        { id: 558, amt: 3000 }, { id: 571, amt: 3000 }, { id: 505, amt: 89 }
    ];

    try {
        await client.query('BEGIN');

        // --- PART A: Fix Phantom Over-payment on ID 25 ---
        console.log("Updating Phantom Invoice 25 (GIV-26-7924)...");
        // Find existing migration allocation for ID 25
        const phantomRes = await client.query(`
            SELECT a.id as a_id, p.id as p_id 
            FROM customer_payment_allocations a
            JOIN customer_payments p ON a.payment_id = p.id
            WHERE a.invoice_id = 25 AND p.transaction_ref = 'MIGRATION'
        `);
        
        if (phantomRes.rows.length > 0) {
            const { a_id, p_id } = phantomRes.rows[0];
            await client.query("UPDATE customer_payment_allocations SET amount = 5094 WHERE id = $1", [a_id]);
            await client.query("UPDATE customer_payments SET amount = 5094 WHERE id = $1", [p_id]);
            console.log(`  [+] Updated ID 25 migration amount to 5094.00`);
        } else {
            console.log("  [!] No existing migration payment found for ID 25. Creating one instead...");
            // Create a new one if it doesn't exist
            const payRes = await client.query(`
                INSERT INTO customer_payments (customer_id, payment_date, amount, payment_mode, transaction_ref, status, verification_status)
                SELECT customer_id, NOW(), 5094, 'Cash', 'MIGRATION_FIX', 'Verified', 'Verified'
                FROM sales_invoices WHERE id = 25
                RETURNING id
            `);
            await client.query(`
                INSERT INTO customer_payment_allocations (payment_id, invoice_id, amount, status)
                VALUES ($1, 25, 5094, 'ACTIVE')
            `, [payRes.rows[0].id]);
        }

        // --- PART B: Restore 36 Missing Payments from Actual.csv ---
        console.log("\nRestoring 36 Missing Payments...");
        for (const item of actualLosses) {
            console.log(`Restoring ${item.amt} for Invoice ID ${item.id}...`);
            
            // Create a recovery payment
            const payRes = await client.query(`
                INSERT INTO customer_payments (customer_id, payment_date, amount, payment_mode, transaction_ref, status, verification_status)
                SELECT customer_id, NOW(), $1, 'Cash', 'MIGRATION_RECOVERY', 'Verified', 'Verified'
                FROM sales_invoices WHERE id = $2
                RETURNING id
            `, [item.amt, item.id]);
            
            if (payRes.rows.length > 0) {
                await client.query(`
                    INSERT INTO customer_payment_allocations (payment_id, invoice_id, amount, status)
                    VALUES ($1, $2, $3, 'ACTIVE')
                `, [payRes.rows[0].id, item.id, item.amt]);
                console.log(`  [+] Success.`);
            } else {
                console.error(`  [!] Failed to find customer for ID ${item.id}`);
            }
        }

        // --- PART C: Global Balance Rebuild for affected invoices ---
        console.log("\nRe-syncing balances for all 37 affected invoices...");
        const allTargetIds = [...actualLosses.map(l => l.id), 25];
        
        for (const id of allTargetIds) {
            await client.query(`
                WITH totals AS (
                    SELECT 
                        si.id,
                        (
                            COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0) +
                            COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0) +
                            COALESCE((SELECT SUM(grand_total) FROM sales_returns WHERE invoice_id = si.id AND status = 'Applied'), 0)
                        ) as calculated_paid
                    FROM sales_invoices si
                    WHERE si.id = $1
                )
                UPDATE sales_invoices 
                SET 
                    amount_paid = totals.calculated_paid,
                    paid_amount = totals.calculated_paid,
                    status = CASE 
                        WHEN totals.calculated_paid >= grand_total - 0.05 THEN 'Paid'
                        WHEN totals.calculated_paid > 0.05 THEN 'Partially Paid'
                        ELSE 'Unpaid'
                    END
                FROM totals
                WHERE sales_invoices.id = totals.id
            `, [id]);
        }
        
        await client.query('COMMIT');
        console.log("\n✅ ALL REPAIRS COMPLETED SUCCESSFULLY!");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Repair Failed:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

repair();
