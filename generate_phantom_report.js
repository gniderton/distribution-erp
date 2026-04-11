const { pool } = require('./config/db');

async function generateReport() {
    const targetInvoices = [
        { id: 38, supposed_mig: 0 },
        { id: 48, supposed_mig: 0 },
        { id: 19, supposed_mig: 0 },
        { id: 20, supposed_mig: 0 },
        { id: 23, supposed_mig: 0 },
        { id: 25, supposed_mig: 5094 },
        { id: 26, supposed_mig: 0 },
        { id: 31, supposed_mig: 0 },
        { id: 51, supposed_mig: 0 },
        { id: 54, supposed_mig: 0 },
        { id: 55, supposed_mig: 0 }
    ];
    
    console.log("| ID | Invoice Number | Grand Total | Real Payments (Correct) | Migration Amount (Ghost) | System Paid Total | User Supposed Migration |");
    console.log("|---|---|---|---|---|---|---|");
    
    for (const item of targetInvoices) {
        try {
            const id = item.id;
            const supposed = item.supposed_mig;
            
            const invRes = await pool.query("SELECT invoice_number, grand_total, amount_paid FROM sales_invoices WHERE id = $1", [id]);
            const inv = invRes.rows[0];

            const allocs = await pool.query(`
                SELECT a.amount, p.transaction_ref
                FROM customer_payment_allocations a
                JOIN customer_payments p ON a.payment_id = p.id
                WHERE a.invoice_id = $1 AND a.status = 'ACTIVE'
            `, [id]);

            let migrationSum = 0;
            let realPaymentSum = 0;

            allocs.rows.forEach(p => {
                if (p.transaction_ref === 'MIGRATION') {
                    migrationSum += parseFloat(p.amount);
                } else {
                    realPaymentSum += parseFloat(p.amount);
                }
            });

            console.log(`| ${id} | ${inv.invoice_number} | ${inv.grand_total} | **${realPaymentSum.toFixed(2)}** | ${migrationSum.toFixed(2)} | ${inv.amount_paid} | ${supposed} |`);

        } catch (err) {
            console.error(err);
        }
    }
    await pool.end();
}

generateReport();
