const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// @route   GET /api/finance/gst/gstr1
// @desc    Get Consolidated GSTR-1 Data (Sales + Asset Sales + Credit Notes)
router.get('/gstr1', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'Please provide start_date and end_date' });
        }

        const query = `
            -- 1. Standard Sales Invoices
            SELECT 
                si.invoice_number as document_no,
                si.invoice_date as document_date,
                c.customer_name as party_name,
                c.gstin as party_gstin,
                'Sales' as type,
                si.total_taxable as taxable_value,
                (COALESCE(si.total_cgst, 0) + COALESCE(si.total_sgst, 0) + COALESCE(si.total_igst, 0)) as total_tax,
                si.grand_total as total_value,
                CASE 
                    WHEN c.gstin IS NOT NULL AND c.gstin != '' THEN 'B2B'
                    ELSE 'B2C'
                END as category
            FROM sales_invoices si
            JOIN customers c ON si.customer_id = c.id
            WHERE si.invoice_date BETWEEN $1 AND $2 AND si.status != 'CANCELLED'

            UNION ALL

            -- 2. Asset Sales
            SELECT 
                a.sale_invoice_no as document_no,
                a.purchase_date as document_date, -- Note: Usually use sale_date if available
                a.sale_buyer_name as party_name,
                a.sale_buyer_gst as party_gstin,
                'Asset Sale' as type,
                a.sale_taxable_amount as taxable_value,
                a.sale_tax_amount as total_tax,
                a.sale_total_amount as total_value,
                'Asset' as category
            FROM assets a
            WHERE a.status = 'Sold' AND a.purchase_date BETWEEN $1 AND $2 -- Simplified date check

            UNION ALL

            -- 3. Sales Returns (Credit Notes)
            SELECT 
                sr.return_number as document_no,
                sr.return_date as document_date,
                c.customer_name as party_name,
                c.gstin as party_gstin,
                'Credit Note' as type,
                -sr.total_taxable as taxable_value,
                -sr.total_tax as total_tax,
                -sr.grand_total as total_value,
                'Return' as category
            FROM sales_returns sr
            JOIN customers c ON sr.customer_id = c.id
            WHERE sr.return_date BETWEEN $1 AND $2 AND sr.status = 'COMPLETED'
            
            ORDER BY document_date DESC
        `;

        const result = await pool.query(query, [start_date, end_date]);
        res.json(result.rows);

    } catch (err) {
        console.error('GST Report Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/finance/gst/gstr3b
// @desc    Get Consolidated GSTR-3B Data (Purchases + Debit Notes)
router.get('/gstr3b', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'Please provide start_date and end_date' });
        }

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
                ph.grand_total as total_value
            FROM purchase_invoice_headers ph
            JOIN vendors v ON ph.vendor_id = v.id
            WHERE ph.vendor_invoice_date BETWEEN $1 AND $2

            UNION ALL

            -- 2. Debit Notes
            SELECT 
                dn.debit_note_number as document_no,
                dn.debit_note_date as document_date,
                v.vendor_name as party_name,
                v.gst as party_gstin,
                'Debit Note' as type,
                -dn.taxable_amount as taxable_value,
                -dn.tax_amount as total_tax,
                -dn.amount as total_value
            FROM debit_notes dn
            JOIN vendors v ON dn.vendor_id = v.id
            WHERE dn.debit_note_date BETWEEN $1 AND $2 AND dn.status != 'REVERSED'

            ORDER BY document_date DESC
        `;

        const result = await pool.query(query, [start_date, end_date]);
        res.json(result.rows);

    } catch (err) {
        console.error('GSTR-3B Report Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
