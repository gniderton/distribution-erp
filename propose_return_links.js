const { pool } = require('./config/db');

const returnsToFix = [
    { num: 'SR-0002', cust: 119, amt: 295.00 },
    { num: 'SR-0003', cust: 552, amt: 105.00 },
    { num: 'SR-0004', cust: 220, amt: 112.00 },
    { num: 'SR-0005', cust: 359, amt: 403.00 },
    { num: 'SR-0006', cust: 223, amt: 510.00 },
    { num: 'SR-0007', cust: 305, amt: 104.00 },
    { num: 'SR-0008', cust: 333, amt: 206.00 },
    { num: 'SR-0009', cust: 336, amt: 420.00 },
    { num: 'SR-0010', cust: 416, amt: 437.00 },
    { num: 'SR-0011', cust: 456, amt: 22.00 },
    { num: 'SR-0012', cust: 610, amt: 208.00 },
    { num: 'SR-0013', cust: 190, amt: 2139.00 },
    { num: 'SR-0014', cust: 480, amt: 595.00 }
];

async function proposeLinks() {
    console.log("Searching for candidate invoices for unlinked returns...");
    
    for (const ret of returnsToFix) {
        try {
            // Find invoices for this customer where amount_paid matches the return, or grand_total is large enough
            const query = `
                SELECT id, invoice_number, grand_total, amount_paid, paid_amount, status, invoice_date
                FROM sales_invoices
                WHERE customer_id = $1
                  AND status != 'Cancelled'
                ORDER BY invoice_date DESC
            `;
            const res = await pool.query(query, [ret.cust]);
            
            console.log(`\nReturn: ${ret.num} | Amount: ${ret.amt} | Cust: ${ret.cust}`);
            
            if (res.rows.length === 0) {
                console.log("  [X] No invoices found for this customer!");
            } else {
                res.rows.forEach(inv => {
                    const isAmountMatch = (parseFloat(inv.amount_paid) == ret.amt || parseFloat(inv.paid_amount) == ret.amt);
                    if (isAmountMatch) {
                        console.log(`  [MATCH] ${inv.invoice_number} (ID: ${inv.id}) | Total: ${inv.grand_total} | Paid: ${inv.amount_paid} <--- High Probability`);
                    } else if (parseFloat(inv.grand_total) >= ret.amt) {
                        console.log(`  [POSSIBLE] ${inv.invoice_number} (ID: ${inv.id}) | Total: ${inv.grand_total} | Paid: ${inv.amount_paid}`);
                    }
                });
            }
        } catch (err) {
            console.error(err);
        }
    }
    await pool.end();
}

proposeLinks();
