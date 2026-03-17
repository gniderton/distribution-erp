const { pool } = require('./config/db');

async function testGRN() {
    try {
        const res = await pool.query('SELECT * FROM purchase_invoice_headers LIMIT 1');
        if (res.rows.length === 0) {
            console.log('No GRNs found to test.');
            return;
        }

        const id = res.rows[0].id;
        const apiRes = await pool.query(`
            WITH invoice_summary AS (
                SELECT 
                    pi.id,
                    pi.invoice_number,
                    v.vendor_name,
                    v.vendor_code,
                    v.contact_no as vendor_contact,
                    v.gst as vendor_gst,
                    v.address_line1 as vendor_address_1,
                    v.district as vendor_district,
                    (SELECT SUM(accepted_qty) FROM purchase_invoice_lines WHERE purchase_invoice_header_id = pi.id) as total_qty,
                    (SELECT SUM(amount - tax_amount) FROM purchase_invoice_lines WHERE purchase_invoice_header_id = pi.id) as total_taxable,
                    (SELECT SUM(tax_amount) FROM purchase_invoice_lines WHERE purchase_invoice_header_id = pi.id) as total_tax_amount
                FROM purchase_invoice_headers pi
                JOIN vendors v ON pi.vendor_id = v.id
                WHERE pi.id = $1
            )
            SELECT * FROM invoice_summary
        `, [id]);

        console.log('--- API Enrichment Test ---');
        console.table(apiRes.rows);
        
        if (apiRes.rows[0].vendor_gst && apiRes.rows[0].vendor_address_1) {
            console.log('✅ Success: Vendor metadata included in response.');
        } else {
            console.log('❌ Failure: Missing critical vendor metadata.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
testGRN();
