const { pool } = require('../config/db');

async function auditInvoice(invNum) {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT id, grand_total, amount_paid FROM sales_invoices WHERE invoice_number = $1', [invNum]);
        if (res.rows.length === 0) return console.log("Invoice not found");
        const invId = res.rows[0].id;

        console.log(`--- Allocation Audit for ${invNum} ---`);
        const allocs = await client.query(`
            SELECT 
                cpa.amount, 
                cpa.allocated_at,
                sr.return_number,
                cp.payment_number
            FROM customer_payment_allocations cpa
            LEFT JOIN sales_returns sr ON cpa.return_id = sr.id
            LEFT JOIN customer_payments cp ON cpa.payment_id = cp.id
            WHERE cpa.invoice_id = $1
        `, [invId]);
        console.table(allocs.rows);

    } finally {
        client.release();
        await pool.end();
    }
}

auditInvoice('INV-26-0314');
