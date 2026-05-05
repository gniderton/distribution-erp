const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable'
});

// GSTR-1: Sales and Returns with Line-Item Accuracy
router.get('/gstr1', async (req, res) => {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date || start_date === 'null') {
        return res.status(400).json({ error: "Please provide valid start_date and end_date" });
    }

    try {
        const query = `
            -- 1. Sales Invoices (Broken down by Tax Rate)
            SELECT 
                si.invoice_number as document_no,
                si.invoice_date as document_date,
                c.customer_name as party_name,
                c.gstin as party_gstin,
                'Sales' as type,
                SUM(sl.taxable_amount) as taxable_value,
                SUM(sl.tax_amount) as total_tax,
                -- We estimate total value for this rate slice
                SUM(sl.taxable_amount + sl.tax_amount) as total_value,
                sl.tax_percent as tax_rate,
                'Sales' as category
            FROM sales_invoices si
            JOIN customers c ON si.customer_id = c.id
            JOIN sales_invoice_lines sl ON si.id = sl.invoice_id
            WHERE si.invoice_date BETWEEN $1 AND $2 AND si.status != 'CANCELLED'
            GROUP BY si.invoice_number, si.invoice_date, c.customer_name, c.gstin, sl.tax_percent

            UNION ALL

            -- 2. Asset Sales (Joined with transactions for the date)
            SELECT 
                a.asset_name as document_no,
                at.transaction_date as document_date,
                a.sale_buyer_name as party_name,
                a.sale_buyer_gst as party_gstin,
                'Asset Sale' as type,
                a.sale_taxable_amount as taxable_value,
                a.sale_tax_amount as total_tax,
                a.sale_total_amount as total_value,
                ROUND((a.sale_tax_amount / NULLIF(a.sale_taxable_amount, 0)) * 100) as tax_rate,
                'Asset' as category
            FROM assets a
            JOIN asset_transactions at ON a.id = at.asset_id
            WHERE a.sale_is_gst = true 
              AND at.transaction_type = 'SALE'
              AND at.transaction_date BETWEEN $1 AND $2

            UNION ALL

            -- 3. Sales Returns (Credit Notes - Broken down by Tax Rate)
            SELECT 
                sr.return_number as document_no,
                sr.return_date as document_date,
                c.customer_name as party_name,
                c.gstin as party_gstin,
                'Credit Note' as type,
                -SUM(srl.taxable_amount) as taxable_value,
                -SUM(srl.tax_amount) as total_tax,
                -SUM(srl.taxable_amount + srl.tax_amount) as total_value,
                srl.tax_percent as tax_rate,
                'Return' as category
            FROM sales_returns sr
            JOIN customers c ON sr.customer_id = c.id
            JOIN sales_return_lines srl ON sr.id = srl.return_id
            WHERE sr.return_date BETWEEN $1 AND $2 AND sr.status = 'Applied'
            GROUP BY sr.return_number, sr.return_date, c.customer_name, c.gstin, srl.tax_percent
            
            ORDER BY document_date DESC
        `;
        const result = await pool.query(query, [start_date, end_date]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GSTR-3B: Purchases and Debit Notes
router.get('/gstr3b', async (req, res) => {
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date || start_date === 'null') {
        return res.status(400).json({ error: "Please provide valid start_date and end_date" });
    }
    try {
        const query = `
            -- 1. Purchases
            SELECT 
                ph.invoice_number as document_no,
                ph.vendor_invoice_date as document_date,
                v.vendor_name as party_name,
                v.gst as party_gstin,
                'Purchase' as type,
                ph.taxable_amount as taxable_value,
                ph.tax_amount as total_tax,
                ph.grand_total as total_value,
                'Purchase' as category
            FROM purchase_invoice_headers ph
            JOIN vendors v ON ph.vendor_id = v.id
            WHERE ph.vendor_invoice_date BETWEEN $1 AND $2

            UNION ALL

            -- 2. Debit Notes (Purchase Returns - Broken down by Tax Rate)
            SELECT 
                dn.debit_note_number as document_no,
                dn.debit_note_date as document_date,
                v.vendor_name as party_name,
                v.gst as party_gstin,
                'Debit Note' as type,
                -SUM(dnl.amount - dnl.tax_amount) as taxable_value,
                -SUM(dnl.tax_amount) as total_tax,
                -SUM(dnl.amount) as total_value,
                dnl.tax_percentage as tax_rate,
                'Return' as category
            FROM debit_notes dn
            JOIN vendors v ON dn.vendor_id = v.id
            JOIN debit_note_lines dnl ON dn.id = dnl.debit_note_id
            WHERE dn.debit_note_date BETWEEN $1 AND $2
            GROUP BY dn.debit_note_number, dn.debit_note_date, v.vendor_name, v.gst, dnl.tax_percentage
            
            ORDER BY document_date DESC
        `;
        const result = await pool.query(query, [start_date, end_date]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GSTR-1: HSN Summary
router.get('/hsn-summary', async (req, res) => {
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date || start_date === 'null') {
        return res.status(400).json({ error: "Please provide valid start_date and end_date" });
    }

    try {
        const query = `
            WITH combined_lines AS (
                -- Sales Lines
                SELECT 
                    hc.hsn_code,
                    hc.hsn_description as hsn_desc,
                    p.uom,
                    sl.shipped_qty as qty,
                    sl.taxable_amount as txval,
                    sl.tax_amount as total_tax,
                    sl.tax_percent as rt
                FROM sales_invoices si
                JOIN sales_invoice_lines sl ON si.id = sl.invoice_id
                JOIN products p ON sl.product_id = p.id
                JOIN hsn_codes hc ON p.hsn_id = hc.id
                WHERE si.invoice_date BETWEEN $1 AND $2 AND si.status != 'CANCELLED'

                UNION ALL

                -- Sales Return Lines (Subtracting)
                SELECT 
                    hc.hsn_code,
                    hc.hsn_description as hsn_desc,
                    p.uom,
                    -srl.qty as qty,
                    -srl.taxable_amount as txval,
                    -srl.tax_amount as total_tax,
                    srl.tax_percent as rt
                FROM sales_returns sr
                JOIN sales_return_lines srl ON sr.id = srl.return_id
                JOIN products p ON srl.product_id = p.id
                JOIN hsn_codes hc ON p.hsn_id = hc.id
                WHERE sr.return_date BETWEEN $1 AND $2 AND sr.status = 'Applied'
            )
            SELECT 
                hsn_code as hsn_sc,
                hsn_desc as desc,
                COALESCE(uom, 'OTH') as uqc,
                SUM(qty) as qty,
                SUM(txval + total_tax) as val,
                SUM(txval) as txval,
                SUM(total_tax) / 2 as camt,
                SUM(total_tax) / 2 as samt,
                0 as iamt,
                0 as csamt,
                rt
            FROM combined_lines
            GROUP BY hsn_code, hsn_desc, uom, rt
        `;
        const result = await pool.query(query, [start_date, end_date]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
