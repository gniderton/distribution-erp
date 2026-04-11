const { pool } = require('./config/db');

async function analyzeSureash() {
    const customerId = 220; // Sureash vegitable malaaparamb
    const invoiceNumber = 'INV-26-0028';
    
    console.log(`Analyzing Customer: ${customerId} (Sureash vegitable malaaparamb)`);
    console.log(`Analyzing Invoice: ${invoiceNumber}`);

    try {
        // 1. Get Invoice status details (What Dashboard API 1 uses)
        const invRes = await pool.query(`
            SELECT id, invoice_number, grand_total, amount_paid, paid_amount, status 
            FROM sales_invoices 
            WHERE invoice_number = $1
        `, [invoiceNumber]);
        console.log("\n--- Sales Invoice Table State (What Dashboard Sees) ---");
        console.table(invRes.rows);

        const invoiceId = invRes.rows[0]?.id;

        // 2. Get Allocations and Returns (What Selector API 2 calculates)
        if (invoiceId) {
            const allocRes = await pool.query(`
                SELECT id, amount, status, allocated_at 
                FROM customer_payment_allocations 
                WHERE invoice_id = $1
            `, [invoiceId]);
            console.log("\n--- Customer Payment Allocations ---");
            console.table(allocRes.rows);

            const returnRes = await pool.query(`
                SELECT id, sales_return_number, grand_total, status, created_at
                FROM sales_returns 
                WHERE invoice_id = $1
            `, [invoiceId]);
            console.log("\n--- Sales Returns (Applied) ---");
            console.table(returnRes.rows);

            // 3. Simulate API 2 calculation
            const totalAlloc = allocRes.rows.filter(r => r.status === 'ACTIVE').reduce((sum, r) => sum + parseFloat(r.amount), 0);
            const totalReturn = returnRes.rows.filter(r => r.status === 'Applied').reduce((sum, r) => sum + parseFloat(r.grand_total), 0);
            const grandTotal = parseFloat(invRes.rows[0].grand_total);
            const balance = grandTotal - totalAlloc - totalReturn;

            console.log("\n--- Ground Truth Summary (API 2 Logic) ---");
            console.log(`Grand Total: ${grandTotal}`);
            console.log(`Total Active Allocations: ${totalAlloc}`);
            console.log(`Total Applied Returns:    ${totalReturn}`);
            console.log(`Calculated Balance:       ${balance}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

analyzeSureash();
