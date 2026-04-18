const { pool } = require('../config/db');

async function auditRecentInvoices() {
    try {
        console.log("--- AUDITING RECENT INVOICES (FOR 222/224) ---");
        const res = await pool.query(`
            SELECT 
                si.id, si.invoice_number, si.grand_total, si.created_at,
                c.customer_name,
                (SELECT json_agg(json_build_object('pid', sil.product_id, 'qty', sil.shipped_qty)) 
                 FROM sales_invoice_lines sil WHERE sil.invoice_id = si.id) as lines
            FROM sales_invoices si
            JOIN customers c ON si.customer_id = c.id
            WHERE si.created_at > NOW() - INTERVAL '1 hour'
            ORDER BY si.created_at DESC
        `);
        
        if (res.rows.length === 0) {
            console.log("No invoices found in the last hour.");
        } else {
            console.table(res.rows.map(r => ({
                invoice: r.invoice_number,
                customer: r.customer_name,
                total: r.grand_total,
                has_222: r.lines?.some(l => l.pid == 222),
                has_224: r.lines?.some(l => l.pid == 224),
                line_count: r.lines?.length
            })));
            
            console.log("\nFull Details for the latest invoice:");
            console.log(JSON.stringify(res.rows[0], null, 2));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

auditRecentInvoices();
