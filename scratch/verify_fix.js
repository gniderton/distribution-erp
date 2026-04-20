const { pool } = require('../config/db');

async function verify() {
    const query = `
        SELECT 
            si.invoice_number, 
            si.grand_total, 
            (
                COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE' AND return_id IS NULL), 0) +
                COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0) +
                COALESCE((SELECT SUM(grand_total) FROM sales_returns WHERE invoice_id = si.id AND status = 'Applied'), 0)
            ) as paid,
            (
                si.grand_total - 
                COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE' AND return_id IS NULL), 0) -
                COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0) -
                COALESCE((SELECT SUM(grand_total) FROM sales_returns WHERE invoice_id = si.id AND status = 'Applied'), 0)
            ) as balance
        FROM sales_invoices si 
        WHERE si.id = 178
    `;
    const res = await pool.query(query);
    console.table(res.rows);
    process.exit(0);
}

verify();
