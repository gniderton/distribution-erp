const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// 1. List Credit Note Headers with Nested Items
router.get('/', async (req, res) => {
    try {
        const { start_date, end_date, customer_id, status } = req.query;
        
        let query = `
            SELECT 
                sr.id, 
                sr.return_number, 
                sr.return_date, 
                sr.type, 
                sr.grand_total as amount, 
                sr.total_taxable, 
                sr.total_tax, 
                sr.status, 
                sr.remarks as reason,
                c.customer_name,
                c.gstin as customer_gst,
                c.customer_phone as customer_contact,
                c.email as customer_email,
                COALESCE(ca.address_line1 || ' ' || COALESCE(ca.address_line2, ''), '') as customer_address,
                COALESCE(ca.city, '') as customer_district,
                COALESCE(ca.pincode, '') as customer_pin,
                si.invoice_number as linked_invoice_number,
                e.full_name as created_by_name,
                COALESCE(json_agg(json_build_object(
                    'S.No', srl.id,
                    'EAN Code', p.ean_code,
                    'product_code', p.product_code,
                    'hsn_code', h.hsn_code,
                    'Item Name', p.product_name,
                    'MRP', ib.mrp,
                    'Price', srl.rate,
                    'Qty', srl.qty,
                    'Sch', srl.scheme_amount,
                    'Disc %', 0,
                    'GST %', srl.tax_percent,
                    'Gross $', srl.gross_amount,
                    'Disc. $', srl.scheme_amount,
                    'Taxable $', srl.taxable_amount,
                    'GST $', srl.tax_amount,
                    'Net $', srl.amount,
                    'Batch No', ib.batch_code,
                    'Expiry', ib.expiry_date,
                    '_product_id', srl.product_id
                )) FILTER (WHERE srl.id IS NOT NULL), '[]') as items
            FROM sales_returns sr
            JOIN customers c ON sr.customer_id = c.id
            LEFT JOIN customer_addresses ca ON c.id = ca.customer_id AND ca.is_default_billing = true
            LEFT JOIN sales_invoices si ON sr.invoice_id = si.id
            LEFT JOIN employees e ON sr.created_by = e.id
            LEFT JOIN sales_return_lines srl ON sr.id = srl.return_id
            LEFT JOIN products p ON srl.product_id = p.id
            LEFT JOIN hsn_codes h ON p.hsn_id = h.id
            LEFT JOIN inventory_batches ib ON srl.batch_id = ib.id
            WHERE sr.is_active = true
        `;
        const params = [];
        let paramCount = 1;

        if (start_date) {
            query += ` AND sr.return_date >= $${paramCount++}`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND sr.return_date <= $${paramCount++}`;
            params.push(end_date);
        }
        if (customer_id) {
            query += ` AND sr.customer_id = $${paramCount++}`;
            params.push(customer_id);
        }
        if (status) {
            query += ` AND sr.status = $${paramCount++}`;
            params.push(status);
        }

        query += ` GROUP BY sr.id, c.customer_name, c.gstin, c.customer_phone, c.email, ca.address_line1, ca.address_line2, ca.city, ca.pincode, si.invoice_number, e.full_name
                   ORDER BY sr.return_date DESC, sr.id DESC`;


        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('List Credit Notes Error:', err);
        res.status(500).json({ error: err.message });
    }
});


// 2. Get Single Credit Note with Lines
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const headerRes = await pool.query(`
            SELECT 
                sr.*,
                c.customer_name,
                c.gstin as customer_gstin,
                si.invoice_number as original_invoice_number,
                e.full_name as created_by_name
            FROM sales_returns sr
            JOIN customers c ON sr.customer_id = c.id
            LEFT JOIN sales_invoices si ON sr.invoice_id = si.id
            LEFT JOIN employees e ON sr.created_by = e.id
            WHERE sr.id = $1
        `, [id]);

        if (headerRes.rows.length === 0) {
            return res.status(404).json({ error: "Credit Note not found" });
        }

        const linesRes = await pool.query(`
            SELECT 
                srl.*, 
                p.product_name,
                ib.batch_code as batch_number
            FROM sales_return_lines srl
            JOIN products p ON srl.product_id = p.id
            LEFT JOIN inventory_batches ib ON srl.batch_id = ib.id
            WHERE srl.return_id = $1
            ORDER BY srl.id ASC
        `, [id]);

        res.json({
            ...headerRes.rows[0],
            lines: linesRes.rows
        });
    } catch (err) {
        console.error('Get Credit Note Detail Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Get All Credit Notes for a Customer with Nested Items
// Perfect for Appsmith "Customer History" view
router.get('/customer/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 
                sr.id, 
                sr.return_number, 
                sr.return_date, 
                sr.grand_total, 
                sr.status,
                COALESCE(json_agg(json_build_object(
                    'product_name', p.product_name,
                    'qty', srl.qty,
                    'amount', srl.amount
                )) FILTER (WHERE srl.id IS NOT NULL), '[]') as items
            FROM sales_returns sr
            LEFT JOIN sales_return_lines srl ON sr.id = srl.return_id
            LEFT JOIN products p ON srl.product_id = p.id
            WHERE sr.customer_id = $1 AND sr.is_active = true
            GROUP BY sr.id
            ORDER BY sr.return_date DESC
        `;
        const result = await pool.query(query, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error('Customer Credit Notes Error:', err);
        res.status(500).json({ error: err.message });
    }
});


// 4. NULLIFY (Delete/Cancel) a Sales Return
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // A. Verify the return exists and its current status
        const srRes = await client.query('SELECT status, return_number, is_active FROM sales_returns WHERE id = $1', [id]);
        if (srRes.rows.length === 0) {
            throw new Error("Credit Note not found");
        }
        if (srRes.rows[0].status === 'Cancelled' || !srRes.rows[0].is_active) {
            throw new Error("Credit Note is already cancelled");
        }

        // B. Rollback Allocations (Restore Invoice Balances)
        // This is the most important step for financial cleanup
        await client.query('DELETE FROM customer_payment_allocations WHERE return_id = $1', [id]);

        // C. Rollback Stock (Only if returned to stock)
        const linesRes = await client.query('SELECT product_id, batch_id, qty, return_to_stock FROM sales_return_lines WHERE return_id = $1', [id]);
        for (const line of linesRes.rows) {
            if (line.return_to_stock && line.batch_id) {
                const batchRes = await client.query('SELECT quantity_remaining, batch_code FROM inventory_batches WHERE id = $1', [line.batch_id]);
                if (batchRes.rows.length > 0) {
                    const available = Number(batchRes.rows[0].quantity_remaining);
                    
                    // Safety Check: Prevent negative stock if returned qty was already sold
                    if (available < line.qty) {
                        throw new Error(`Cannot nullify: Batch ${batchRes.rows[0].batch_code} only has ${available} qty left, but we need to remove ${line.qty} (returned stock already sold)`);
                    }
                    
                    await client.query('UPDATE inventory_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2', [line.qty, line.batch_id]);
                    await client.query('INSERT INTO stock_traceability (batch_id, product_id, quantity_change, transaction_type, reference_id, reference_type) VALUES ($1, $2, $3, $4, $5, $6)', [line.batch_id, line.product_id, -line.qty, 'CANCEL_RET', id, 'Sales Return Cancellation']);
                }
            }
        }

        // D. Rollback Accounting
        await client.query("UPDATE journal_entries SET is_active = false WHERE reference_type = 'SALES_RET' AND reference_id = $1", [id]);

        // E. Finalize Cancellation
        await client.query("UPDATE sales_returns SET status = 'Cancelled', is_active = false WHERE id = $1", [id]);

        await client.query('COMMIT');
        res.json({ success: true, message: `Credit Note ${srRes.rows[0].return_number} has been nullified successfully.` });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Nullify Credit Note Error:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;

