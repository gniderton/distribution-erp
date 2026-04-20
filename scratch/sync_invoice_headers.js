const { pool } = require('../config/db');

async function syncHeaders() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log("🚀 Starting Master Invoice Header Sync...\n");

        // 1. Calculate and Update Invoices based on Allocations and Advances
        const syncRes = await client.query(`
            WITH PaymentTotals AS (
                SELECT invoice_id, SUM(amount) as direct_paid
                FROM customer_payment_allocations
                GROUP BY invoice_id
            ),
            AdvanceTotals AS (
                SELECT invoice_id, SUM(amount) as advance_paid
                FROM advance_utilizations
                GROUP BY invoice_id
            ),
            CombinedTotals AS (
                SELECT 
                    si.id as invoice_id,
                    si.grand_total,
                    COALESCE(p.direct_paid, 0) as direct_paid,
                    COALESCE(a.advance_paid, 0) as advance_paid,
                    (COALESCE(p.direct_paid, 0) + COALESCE(a.advance_paid, 0)) as total_calculated_paid
                FROM sales_invoices si
                LEFT JOIN PaymentTotals p ON si.id = p.invoice_id
                LEFT JOIN AdvanceTotals a ON si.id = a.invoice_id
                WHERE si.status != 'Cancelled'
            )
            UPDATE sales_invoices si
            SET 
                paid_amount = ct.total_calculated_paid,
                amount_paid = ct.total_calculated_paid,
                status = CASE 
                    WHEN ct.total_calculated_paid >= si.grand_total AND si.grand_total > 0 THEN 'Paid'
                    ELSE 'Unpaid'
                END
            FROM CombinedTotals ct
            WHERE si.id = ct.invoice_id
            AND (
                ABS(COALESCE(si.paid_amount, 0) - ct.total_calculated_paid) > 0.01 OR 
                ABS(COALESCE(si.amount_paid, 0) - ct.total_calculated_paid) > 0.01 OR
                si.status != (CASE WHEN ct.total_calculated_paid >= si.grand_total AND si.grand_total > 0 THEN 'Paid' ELSE 'Unpaid' END)
            )
            RETURNING si.id, si.invoice_number, si.paid_amount
        `);

        console.log(`✅ Successfully synced ${syncRes.rows.length} invoice headers.`);
        
        if (syncRes.rows.length > 0) {
            console.log("\nSample of fixed invoices:");
            console.table(syncRes.rows.slice(0, 10));
        }

        await client.query('COMMIT');
        console.log("\n✨ Re-sync Complete. All invoice headers now match their payment records.");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Sync Error:", err);
    } finally {
        process.exit();
    }
}

syncHeaders();
