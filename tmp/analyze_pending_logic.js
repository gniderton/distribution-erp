const { pool } = require('./config/db');

async function analyze() {
    console.log("Analyzing Inconsistency between Status and Calculations...");
    
    try {
        const query = `
            SELECT 
                si.id, 
                si.invoice_number, 
                si.grand_total, 
                si.status,
                COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0) as alloc_sum,
                COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0) as advance_sum,
                COALESCE((SELECT SUM(grand_total) FROM sales_returns WHERE invoice_id = si.id AND status = 'Applied'), 0) as return_sum
            FROM sales_invoices si
            WHERE si.status != 'Cancelled'
        `;
        
        const res = await pool.query(query);
        
        const discrepancies = res.rows.filter(row => {
            const totalPaid = Number(row.alloc_sum) + Number(row.advance_sum) + Number(row.return_sum);
            const balance = Number(row.grand_total) - totalPaid;
            
            // If it's excluded from "pending-bills" (balance <= 0.01)
            // But status is not 'Paid' (meaning it should be in the pending list)
            return balance <= 0.01 && row.status !== 'Paid';
        });

        console.log(`Found ${discrepancies.length} invoices that are excluded from the pending list but are not marked 'Paid'.`);
        
        discrepancies.forEach(d => {
            const totalPaid = Number(d.alloc_sum) + Number(d.advance_sum) + Number(d.return_sum);
            console.log(`\nInvoice: ${d.invoice_number} (ID: ${d.id})`);
            console.log(`  Status: ${d.status}`);
            console.log(`  Grand Total: ${d.grand_total}`);
            console.log(`  Allocations: ${d.alloc_sum}`);
            console.log(`  Advances:    ${d.advance_sum}`);
            console.log(`  Returns:     ${d.return_sum}`);
            console.log(`  Total Paid:  ${totalPaid}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

analyze();
