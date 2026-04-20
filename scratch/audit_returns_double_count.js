const { pool } = require('../config/db');

async function auditReturns() {
    try {
        console.log("--- Auditing Double-Counting Issue in Pending Bills ---");

        // Find invoices that have at least one Applied Sales Return
        const invoicesWithReturns = await pool.query(`
            SELECT DISTINCT invoice_id 
            FROM sales_returns 
            WHERE status = 'Applied' AND invoice_id IS NOT NULL
            LIMIT 10
        `);

        if (invoicesWithReturns.rows.length === 0) {
            console.log("No invoices found with applied sales returns.");
            process.exit(0);
        }

        for (const row of invoicesWithReturns.rows) {
            const invoiceId = row.invoice_id;

            const data = await pool.query(`
                SELECT 
                    si.id, si.invoice_number, si.grand_total,
                    c.customer_name,
                    
                    -- Sum from sales_returns
                    COALESCE((SELECT SUM(grand_total) FROM sales_returns WHERE invoice_id = si.id AND status = 'Applied'), 0) as return_sum,
                    
                    -- Sum from allocations
                    COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0) as allocation_sum,
                    
                    -- Check if any allocations have return_id
                    COALESCE((SELECT COUNT(*) FROM customer_payment_allocations WHERE invoice_id = si.id AND return_id IS NOT NULL), 0) as return_linked_allocations_count,
                    COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND return_id IS NOT NULL), 0) as return_linked_allocations_sum
                    
                FROM sales_invoices si
                JOIN customers c ON si.customer_id = c.id
                WHERE si.id = $1
            `, [invoiceId]);

            const inv = data.rows[0];
            const overlap = inv.return_linked_allocations_sum > 0;
            
            console.log(`\nInvoice: ${inv.invoice_number} (ID: ${inv.id}) | Customer: ${inv.customer_name}`);
            console.log(`  Grand Total: ${inv.grand_total}`);
            console.log(`  Returns (Applied): ${inv.return_sum}`);
            console.log(`  Allocations (Active): ${inv.allocation_sum}`);
            console.log(`  Return-linked Allocations: ${inv.return_linked_allocations_sum} (Count: ${inv.return_linked_allocations_count})`);
            
            if (overlap && inv.return_sum > 0) {
                console.log(`  ⚠️  POTENTIAL DOUBLE COUNT: ${inv.return_linked_allocations_sum} is counted in BOTH.`);
                const reportedPaid = parseFloat(inv.return_sum) + parseFloat(inv.allocation_sum);
                console.log(`  Reported Paid (Summing both): ${reportedPaid.toFixed(2)}`);
            } else {
                console.log(`  ✅ No overlap detected.`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

auditReturns();
