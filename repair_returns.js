const { pool } = require('./config/db');

const mapping = [
    { num: 'SR-0002', inv_no: 'INV-26-0005' },
    { num: 'SR-0004', inv_no: 'INV-26-0028' },
    { num: 'SR-0006', inv_no: 'INV-26-0058' },
    { num: 'SR-0007', inv_no: 'INV-26-0080' },
    { num: 'SR-0008', inv_no: 'INV-26-0066' },
    { num: 'SR-0009', inv_no: 'INV-26-0069' },
    { num: 'SR-0010', inv_no: 'INV-26-0074' },
    { num: 'SR-0011', inv_no: 'INV-26-0060' },
    { num: 'SR-0012', inv_no: 'INV-26-0059' },
    { num: 'SR-0013', inv_no: 'INV-26-0136' },
    { num: 'SR-0014', inv_no: 'INV-26-0098' },
    { num: 'SR-0003', inv_no: 'INV-26-0004' },
    { num: 'SR-0005', inv_no: 'INV-26-0042' }
];

async function repair() {
    console.log("🚀 Starting Sales Return Linkage Repair...");
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        for (const item of mapping) {
            console.log(`Linking ${item.num} to ${item.inv_no}...`);
            
            // 1. Get Invoice ID
            const invRes = await client.query("SELECT id FROM sales_invoices WHERE invoice_number = $1", [item.inv_no]);
            if (invRes.rows.length === 0) {
                console.error(`  [!] Invoice ${item.inv_no} not found!`);
                continue;
            }
            const invoiceId = invRes.rows[0].id;

            // 2. Update Sales Return
            const updRes = await client.query(
                "UPDATE sales_returns SET invoice_id = $1 WHERE return_number = $2",
                [invoiceId, item.num]
            );
            console.log(`  [+] Linked ${updRes.rowCount} return record.`);

            // 3. Force Rebuild Balance for this specific invoice
            // Logic: Sum Allocs + Adv + Returns
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
                    paid_amount = totals.calculated_paid, -- Sync both columns
                    status = CASE 
                        WHEN totals.calculated_paid >= grand_total - 0.05 THEN 'Paid'
                        WHEN totals.calculated_paid > 0.05 THEN 'Partially Paid'
                        ELSE 'Unpaid'
                    END
                FROM totals
                WHERE sales_invoices.id = totals.id
            `, [invoiceId]);
            console.log(`  [*] Updated invoice balance and status.`);
        }

        await client.query('COMMIT');
        console.log("\n✅ Repair Completed Successfully!");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Repair Failed:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

repair();
