const { pool } = require('./config/db');

async function testEndpoint() {
    const customerId = 787; // BIG MART BAKERY
    console.log(`Testing /api/customers/${customerId}/pending-bills logic...`);
    
    try {
        const query = `
            SELECT 
                si.id, 
                si.invoice_number, 
                si.grand_total, 
                (
                    COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0) +
                    COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0) +
                    COALESCE((SELECT SUM(grand_total) FROM sales_returns WHERE invoice_id = si.id AND status = 'Applied'), 0)
                ) as amount_paid,
                (
                    si.grand_total - 
                    COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0) -
                    COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0) -
                    COALESCE((SELECT SUM(grand_total) FROM sales_returns WHERE invoice_id = si.id AND status = 'Applied'), 0)
                ) as balance_amount,
                si.status
            FROM sales_invoices si
            WHERE si.customer_id = $1 
              AND si.status != 'Cancelled'
              AND (
                si.grand_total - 
                COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0) -
                COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0) -
                COALESCE((SELECT SUM(grand_total) FROM sales_returns WHERE invoice_id = si.id AND status = 'Applied'), 0)
              ) > 0.01 
        `;
        
        const res = await pool.query(query, [customerId]);
        console.log(`Query returned ${res.rows.length} rows.`);
        console.table(res.rows);

        const found = res.rows.find(r => r.id === '205');
        if (found) {
            console.log("✅ Invoice 205 IS found in the list.");
        } else {
            console.log("❌ Invoice 205 IS NOT found in the list.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

testEndpoint();
