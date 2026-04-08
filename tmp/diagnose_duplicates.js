const { pool } = require('../config/db');

async function diagnose() {
    try {
        console.log("Searching for payments with over-allocation...");
        
        const res = await pool.query(`
            SELECT 
                cp.id as payment_id,
                cp.payment_number,
                cp.amount as payment_amount,
                SUM(cpa.amount) as total_allocated,
                COUNT(cpa.id) as allocation_count,
                cp.verification_status
            FROM customer_payments cp
            JOIN customer_payment_allocations cpa ON cp.id = cpa.payment_id
            WHERE cpa.status = 'ACTIVE'
            GROUP BY cp.id, cp.payment_number, cp.amount, cp.verification_status
            HAVING SUM(cpa.amount) > cp.amount + 0.01
            ORDER BY cp.id DESC;
        `);

        if (res.rows.length === 0) {
            console.log("No over-allocated payments found in 'ACTIVE' state.");
        } else {
            console.table(res.rows);
            console.log(`Found ${res.rows.length} corrupted payments.`);
            
            // For the first one, show invoice details
            const firstId = res.rows[0].payment_id;
            const details = await pool.query(`
                SELECT 
                    cpa.id as alloc_id,
                    cpa.invoice_id,
                    si.invoice_number,
                    cpa.amount as allocated_amount,
                    cpa.status
                FROM customer_payment_allocations cpa
                JOIN sales_invoices si ON cpa.invoice_id = si.id
                WHERE cpa.payment_id = $1
                ORDER BY cpa.created_at;
            `, [firstId]);
            
            console.log(`\nAllocation details for Payment ${res.rows[0].payment_number}:`);
            console.table(details.rows);
        }

    } catch (err) {
        console.error("Diagnosis Error:", err);
    } finally {
        await pool.end();
    }
}

diagnose();
