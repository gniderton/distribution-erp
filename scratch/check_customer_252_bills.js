const { pool } = require('../config/db');

async function checkBills(customerId) {
    try {
        const query = `
            SELECT 
                si.id, 
                si.invoice_number, 
                si.invoice_date, 
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
                si.status,
                c.customer_name
            FROM sales_invoices si
            JOIN customers c ON si.customer_id = c.id
            WHERE si.customer_id = $1 
              AND si.status != 'Cancelled'
              AND (
                si.grand_total - 
                COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0) -
                COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0) -
                COALESCE((SELECT SUM(grand_total) FROM sales_returns WHERE invoice_id = si.id AND status = 'Applied'), 0)
              ) > 0.01 
            ORDER BY si.invoice_date ASC
        `;
        
        const result = await pool.query(query, [customerId]);
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkBills(252);
