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

            -- 2. Asset Sales (Usually single rate, kept from header for now)
            SELECT 
                asset_name as document_no,
                sale_date as document_date,
                sale_to as party_name,
                NULL as party_gstin,
                'Asset Sale' as type,
                sale_value - sale_tax_amount as taxable_value,
                sale_tax_amount as total_tax,
                sale_value as total_value,
                ROUND((sale_tax_amount / NULLIF(sale_value - sale_tax_amount, 0)) * 100) as tax_rate,
                'Asset' as category
            FROM assets
            WHERE sale_is_gst = true AND sale_date BETWEEN $1 AND $2

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
                v.gstin as party_gstin,
                'Purchase' as type,
                ph.taxable_amount as taxable_value,
                (ph.total_amount - ph.taxable_amount) as total_tax,
                ph.total_amount as total_value,
                'Purchase' as category
            FROM purchase_invoice_headers ph
            JOIN vendors v ON ph.vendor_id = v.id
            WHERE ph.vendor_invoice_date BETWEEN $1 AND $2

            UNION ALL

            -- 2. Debit Notes (Purchase Returns)
            SELECT 
                pr.return_number as document_no,
                pr.return_date as document_date,
                v.vendor_name as party_name,
                v.gstin as party_gstin,
                'Debit Note' as type,
                -pr.total_taxable as taxable_value,
                -pr.total_tax as total_tax,
                -pr.grand_total as total_value,
                'Return' as category
            FROM purchase_returns pr
            JOIN vendors v ON pr.vendor_id = v.id
            WHERE pr.return_date BETWEEN $1 AND $2
            
            ORDER BY document_date DESC
        `;
        const result = await pool.query(query, [start_date, end_date]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
