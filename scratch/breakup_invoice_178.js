const { pool } = require('../config/db');

async function getBreakup(invoiceId) {
    try {
        console.log(`--- Detailed Breakup for Invoice ID: ${invoiceId} ---`);

        // 1. Direct Payments
        const payments = await pool.query(`
            SELECT 
                pa.id as allocation_id, 
                pa.payment_id, 
                cp.payment_number, 
                pa.amount, 
                cp.payment_mode,
                cp.payment_date,
                pa.status as allocation_status
            FROM customer_payment_allocations pa
            JOIN customer_payments cp ON pa.payment_id = cp.id
            WHERE pa.invoice_id = $1 AND pa.status = 'ACTIVE'
        `, [invoiceId]);
        
        console.log("\n1. Direct Payment Allocations:");
        if (payments.rows.length > 0) {
            console.table(payments.rows);
        } else {
            console.log("None");
        }

        // 2. Advance Utilizations
        const advances = await pool.query(`
            SELECT 
                au.id as utilization_id, 
                ca.id as advance_id,
                cp.id as payment_id,
                cp.payment_number,
                au.amount as utilized_amount,
                au.created_at as utilized_at
            FROM advance_utilizations au
            JOIN customer_advances ca ON au.advance_id = ca.id
            JOIN customer_payments cp ON ca.payment_id = cp.id
            WHERE au.invoice_id = $1
        `, [invoiceId]);

        console.log("\n2. Advance Utilizations:");
        if (advances.rows.length > 0) {
            console.table(advances.rows);
        } else {
            console.log("None");
        }

        // 3. Sales Returns
        const returns = await pool.query(`
            SELECT id as return_id, return_number, grand_total, status
            FROM sales_returns
            WHERE invoice_id = $1 AND status = 'Applied'
        `, [invoiceId]);

        console.log("\n3. Applied Sales Returns:");
        if (returns.rows.length > 0) {
            console.table(returns.rows);
        } else {
            console.log("None");
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

getBreakup(178);
