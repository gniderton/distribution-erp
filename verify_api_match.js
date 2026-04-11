const { pool } = require('./config/db');

async function verifyMatch() {
    console.log("Checking for Global Inconsistency between Dashboard and Selector APIs...");
    
    try {
        const query = `
            SELECT 
                si.id, si.invoice_number, si.amount_paid as saved_paid,
                (
                    COALESCE((SELECT SUM(amount) FROM customer_payment_allocations WHERE invoice_id = si.id AND status = 'ACTIVE'), 0) +
                    COALESCE((SELECT SUM(amount) FROM advance_utilizations WHERE invoice_id = si.id), 0) +
                    COALESCE((SELECT SUM(grand_total) FROM sales_returns WHERE invoice_id = si.id AND status = 'Applied'), 0)
                ) as calculated_paid
            FROM sales_invoices si
            WHERE si.status != 'Cancelled'
        `;
        
        const res = await pool.query(query);
        const mismatches = res.rows.filter(r => {
            const diff = Math.abs(parseFloat(r.saved_paid || 0) - parseFloat(r.calculated_paid || 0));
            return diff > 0.05; // 5 paise tolerance
        });

        if (mismatches.length === 0) {
            console.log("\n✅ PERFECT MATCH FOUND!");
            console.log(`Total Invoices Checked: ${res.rows.length}`);
            console.log("Both APIs will now return identical results for every invoice.");
        } else {
            console.log(`\n🚨 MISMATCH FOUND in ${mismatches.length} Invoices!`);
            console.log("Here are the top mismatches:");
            console.table(mismatches.slice(0, 20));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

verifyMatch();
