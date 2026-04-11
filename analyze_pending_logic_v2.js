const { pool } = require('./config/db');

async function analyze() {
    console.log("Analyzing Migrated/Partial Invoices...");
    
    try {
        const query = `
            SELECT 
                si.id, 
                si.invoice_number, 
                si.grand_total, 
                si.status,
                COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0) as alloc_sum,
                (
                    si.grand_total - 
                    COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0) -
                    COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0) -
                    COALESCE((SELECT SUM(grand_total) FROM sales_returns WHERE invoice_id = si.id AND status = 'Applied'), 0)
                ) as calculated_balance
            FROM sales_invoices si
            WHERE si.status != 'Cancelled'
        `;
        
        const res = await pool.query(query);
        
        console.log("TOP 20 INVOICES WITH CALCULATED BALANCE <= 0.01 BUT NOT 'Paid':");
        const list = res.rows.filter(r => r.calculated_balance <= 0.01 && r.status !== 'Paid');
        console.table(list);

        console.log("\nTOP 20 INVOICES WITH STATUS 'Paid' BUT CALCULATED BALANCE > 0.01:");
        const list2 = res.rows.filter(r => r.calculated_balance > 0.01 && r.status === 'Paid');
        console.table(list2);

        // Check for specific "migrated" pattern if any
        const migrated = res.rows.filter(r => !r.invoice_number.startsWith('INV-') && !r.invoice_number.startsWith('GIV-'));
        if (migrated.length > 0) {
            console.log("\nANALYZING OLD MIGRATED INVOICES (Non-INV/GIV):");
            console.table(migrated.slice(0, 20));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

analyze();
