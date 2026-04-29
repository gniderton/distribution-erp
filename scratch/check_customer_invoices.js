const { pool } = require('../config/db');

async function checkCustomerInvoices(customerName) {
    const client = await pool.connect();
    try {
        const custRes = await client.query("SELECT id FROM customers WHERE customer_name = $1", [customerName]);
        if (custRes.rows.length === 0) return console.log("Customer not found");
        const customerId = custRes.rows[0].id;

        console.log(`--- Invoices for ${customerName} ---`);
        const invs = await client.query(`
            SELECT id, invoice_number, grand_total, amount_paid, (grand_total - COALESCE(amount_paid, 0)) as balance, status 
            FROM sales_invoices 
            WHERE customer_id = $1 AND status != 'Cancelled'
            ORDER BY invoice_date DESC
        `, [customerId]);
        console.table(invs.rows);

        console.log(`--- Returns for ${customerName} ---`);
        const rets = await client.query(`
            SELECT sr.id, sr.return_number, sr.grand_total, sr.status,
                   (SELECT SUM(amount) FROM customer_payment_allocations WHERE return_id = sr.id) as allocated
            FROM sales_returns sr
            WHERE sr.customer_id = $1 AND sr.status != 'Cancelled'
        `, [customerId]);
        console.table(rets.rows);

    } finally {
        client.release();
        await pool.end();
    }
}

checkCustomerInvoices('Now-Jas');
