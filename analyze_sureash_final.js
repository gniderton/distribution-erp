const { pool } = require('./config/db');

async function analyzeSureash() {
    const customerId = 220; // Sureash vegitable malaaparamb
    const invoiceNumber = 'INV-26-0028';
    
    console.log(`Analyzing Customer: ${customerId} (Sureash vegitable malaaparamb)`);

    try {
        // 1. Dashboard State (API 1 logic)
        const dashboardQuery = `
            SELECT 
                si.id, si.invoice_number, si.grand_total, 
                COALESCE(si.amount_paid, 0) as saved_amount_paid,
                (si.grand_total - COALESCE(si.amount_paid, 0)) as dashboard_balance,
                si.status
            FROM sales_invoices si
            WHERE si.customer_id = $1 AND si.status != 'Cancelled'
        `;
        const dashRes = await pool.query(dashboardQuery, [customerId]);
        console.log("\n--- API 1: Dashboard Results (Trusts si.amount_paid) ---");
        console.table(dashRes.rows);

        // 2. Selector State (API 2 logic)
        const selectorQuery = `
             SELECT 
                si.id, si.invoice_number, si.grand_total, 
                (
                    COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0) +
                    COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0) +
                    COALESCE((SELECT SUM(grand_total) FROM sales_returns WHERE invoice_id = si.id AND status = 'Applied'), 0)
                ) as calculated_paid,
                (
                    si.grand_total - 
                    COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0) -
                    COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0) -
                    COALESCE((SELECT SUM(grand_total) FROM sales_returns WHERE invoice_id = si.id AND status = 'Applied'), 0)
                ) as selector_balance,
                si.status
            FROM sales_invoices si
            WHERE si.customer_id = $1 AND si.status != 'Cancelled'
        `;
        const selRes = await pool.query(selectorQuery, [customerId]);
        console.log("\n--- API 2: Selector Results (Re-calculates from Allocs/Returns) ---");
        console.table(selRes.rows);

        // 3. Raw Data Details
        const rawRes = await pool.query(`
            SELECT 'Allocation' as type, amount, status, id FROM customer_payment_allocations WHERE customer_id = $1
            UNION ALL
            SELECT 'Return' as type, grand_total as amount, status, id FROM sales_returns WHERE customer_id = $1
        `, [customerId]);
        console.log("\n--- Raw Data (Allocs & Returns) ---");
        console.table(rawRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

analyzeSureash();
