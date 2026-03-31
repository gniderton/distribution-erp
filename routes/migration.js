const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Helper to validate numeric inputs from Excel/CSV (throws descriptive error on "#N/A")
const validateInt = (val, fieldName, recordName) => {
    if (val === null || val === undefined || val === '') return null;
    const num = parseInt(val);
    if (isNaN(num)) {
        throw new Error(`Data Error at '${recordName}': Invalid ${fieldName} value ('${val}'). Please check your source data.`);
    }
    return num;
};

// Helper to validate email format (checks for #N/A or invalid text)
const validateEmail = (val, recordName) => {
    if (val === null || val === undefined) return null;
    const cleanVal = String(val).trim();
    // Broad-spectrum Excel error catch
    if (cleanVal === '' || cleanVal === '#N/A' || cleanVal.startsWith('#VALUE') || cleanVal.startsWith('#REF') || cleanVal.startsWith('#DIV')) return null;
    
    const emailRegex = /^.+@.+\..+$/;
    if (!emailRegex.test(cleanVal)) {
        throw new Error(`Data Error at '${recordName}': Invalid email format ('${cleanVal}'). Please fix or leave blank.`);
    }
    return cleanVal;
};

// Helper to generate sequences
async function generateSequence(client, documentType) {
    const seqRes = await client.query(`
        UPDATE document_sequences 
        SET current_number = current_number + 1 
        WHERE document_type = $1 
        RETURNING prefix, current_number
    `, [documentType]);
    
    if (seqRes.rows.length === 0) return `${documentType}-00001`;
    const { prefix, current_number } = seqRes.rows[0];
    return `${prefix}${String(current_number).padStart(5, '0')}`;
}

// POST /api/migration/loans
router.post('/loans', async (req, res) => {
    const client = await pool.connect();
    try {
        const rows = req.body || [];
        if (!Array.isArray(rows)) {
            return res.status(400).json({ error: "Expected an array of objects." });
        }

        await client.query('BEGIN');
        
        let importedCount = 0;

        for (const row of rows) {
            // Read CSV Columns (accounting for potential case/space variations)
            const type = (row.type || '').toUpperCase() === 'PAYABLE' ? 'TAKEN' : 'GIVEN'; 
            const party_id = row.entity_id || null;
            const party_name = row.party_name || row.entity_name || 'Imported Party'; // Fallback
            const party_type = row.party_type || 'DIRECTOR';
            const loan_date = row.loan_date || new Date().toISOString();
            
            const total_amount = parseFloat(row.total_amount) || 0;
            const paid_amount = parseFloat(row.paid_amount) || 0;
            const balance_principal = total_amount - paid_amount;
            const remarks = row.description || 'Historical Bulk Import';

            // Generate Loan Number
            const loan_number = await generateSequence(client, 'LOAN');

            // Insert into Loans table
            await client.query(`
                INSERT INTO loans (
                    loan_number, loan_type, party_type, party_id, party_name,
                    principal_amount, interest_rate_pa, tenor_months, emi_amount,
                    disbursement_date, start_date, balance_principal, balance_interest,
                    status, remarks, created_by
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6, 0, 1, $6,
                    $7, $7, $8, 0,
                    'Active', $9, 1
                )
            `, [
                loan_number, type, party_type, party_id, party_name,
                total_amount, loan_date, balance_principal, remarks
            ]);

            importedCount++;
        }

        await client.query('COMMIT');
        res.status(200).json({ success: true, count: importedCount, message: `Successfully imported ${importedCount} loans.` });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Loan Bulk Import Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// POST /api/migration/customers
router.post('/customers', async (req, res) => {
    const client = await pool.connect();
    try {
        const rows = req.body || [];
        if (!Array.isArray(rows)) return res.status(400).json({ error: "Expected an array" });

        await client.query('BEGIN');
        let importedCount = 0;

        for (const row of rows) {
            const customer_code = await generateSequence(client, 'CUSTOMER');
            const insertCust = await client.query(`
                INSERT INTO customers (
                    customer_name, customer_code, whatsapp_number, email,
                    is_active, gstin, pan, credit_limit, credit_days,
                    channel_id, route_id, dse_id, route_type_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id
            `, [
                row.customer_name, customer_code, row.whatsapp_number, validateEmail(row.email, row.customer_name),
                row.is_active === 'true' || row.is_active === true, row.gstin, row.pan,
                parseFloat(row.credit_limit) || 0, parseInt(row.credit_days) || 0,
                validateInt(row.channel_id, 'channel_id', row.customer_name),
                validateInt(row.route_id, 'route_id', row.customer_name),
                validateInt(row.dse_id, 'dse_id', row.customer_name),
                validateInt(row.route_type_id, 'route_type_id', row.customer_name)
            ]);
            
            const customer_id = insertCust.rows[0].id;

            if (row.address_line1 || row.city) {
                await client.query(`
                    INSERT INTO customer_addresses (
                        customer_id, address_line1, city, state, pincode, is_default_billing, is_default_shipping
                    ) VALUES ($1, $2, $3, $4, $5, true, true)
                `, [customer_id, row.address_line1, row.city, row.state, validateInt(row.pincode, 'pincode', row.customer_name)]);
            }
            importedCount++;
        }
        await client.query('COMMIT');
        res.json({ success: true, count: importedCount, message: `Imported ${importedCount} customers.` });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// POST /api/migration/vendors
router.post('/vendors', async (req, res) => {
    const client = await pool.connect();
    try {
        const rows = req.body || [];
        if (!Array.isArray(rows)) return res.status(400).json({ error: "Expected an array" });

        await client.query('BEGIN');
        let importedCount = 0;

        for (const row of rows) {
            const vendor_code = await generateSequence(client, 'VENDOR');
            const insertVend = await client.query(`
                INSERT INTO vendors (
                    vendor_name, vendor_code, contact_person, contact_no, email,
                    gst, pan, credit_limit_amount, credit_period_days
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            `, [
                row.company_name || 'Unknown', vendor_code, row.contact_person, row.phone_number, validateEmail(row.email_address || row.email, row.company_name),
                row.gstin, row.pan, parseFloat(row.credit_limit_amount) || 0, validateInt(row.credit_period_days, 'credit_period_days', row.company_name)
            ]);
            
            const vendor_id = insertVend.rows[0].id;

            if (row.city || row.state) {
                await client.query(`
                    INSERT INTO vendor_addresses (
                        vendor_id, address_line, city, state_code, pin_code, is_default
                    ) VALUES ($1, 'Imported Address', $2, $3, $4, true)
                `, [vendor_id, row.city, row.state, row.pin_code]);
            }
            importedCount++;
        }
        await client.query('COMMIT');
        res.json({ success: true, count: importedCount, message: `Imported ${importedCount} vendors.` });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// POST /api/migration/outstanding-invoices
router.post('/outstanding-invoices', async (req, res) => {
    const client = await pool.connect();
    try {
        const rows = req.body || [];
        if (!Array.isArray(rows)) return res.status(400).json({ error: "Expected an array" });

        await client.query('BEGIN');
        let importedCount = 0;

        for (const row of rows) {
            // First we need DSE/Route from the customer
            const custRes = await client.query('SELECT dse_id, route_id FROM customers WHERE id = $1', [row.customer_id]);
            const dse_id = custRes.rows.length ? custRes.rows[0].dse_id : null;
            const route_id = custRes.rows.length ? custRes.rows[0].route_id : null;

            const invIdRes = await client.query(`
                INSERT INTO sales_invoices (
                    customer_id, invoice_number, invoice_date, 
                    grand_total, paid_amount, status
                ) VALUES ($1, $2, $3, $4, $5, 'Unpaid')
                RETURNING id
            `, [
                validateInt(row.customer_id, 'customer_id', row.old_invoice_number), row.old_invoice_number || `OLD-${Date.now()}`,
                row.invoice_date || new Date().toISOString(), parseFloat(row.grand_total) || 0, parseFloat(row.amount_paid) || 0
            ]);

            await client.query(`
                INSERT INTO sales_invoice_lines (
                    sales_invoice_id, product_name, quantity, unit_price, line_total
                ) VALUES ($1, 'Historical Balance Import', 1, $2, $2)
            `, [invIdRes.rows[0].id, parseFloat(row.grand_total) || 0]);

            importedCount++;
        }
        await client.query('COMMIT');
        res.json({ success: true, count: importedCount, message: `Imported ${importedCount} invoices.` });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// POST /api/migration/outstanding-bills
router.post('/outstanding-bills', async (req, res) => {
    const client = await pool.connect();
    try {
        const rows = req.body || [];
        if (!Array.isArray(rows)) return res.status(400).json({ error: "Expected an array" });

        await client.query('BEGIN');
        let importedCount = 0;

        for (const row of rows) {
            const billIdRes = await client.query(`
                INSERT INTO purchase_invoice_headers (
                    vendor_id, invoice_number, vendor_invoice_date, received_date, status, 
                    total_net, tax_amount, grand_total
                ) VALUES ($1, $2, $3, $3, 'Active', $4, 0, $4)
                RETURNING id
            `, [
                validateInt(row.vendor_id, 'vendor_id', row.old_bill_number), row.old_bill_number || `OLD-BILL-${Date.now()}`,
                row.bill_date || new Date().toISOString(), parseFloat(row.grand_total) || 0
            ]);

            // Track amount paid by creating a migration payment and linking it
            if (parseFloat(row.amount_paid) > 0) {
                // 1. Create a dummy payment record for the migration balance
                const payRes = await client.query(`
                    INSERT INTO vendor_payments (
                        vendor_id, amount, payment_date, payment_mode, transaction_ref, remarks
                    ) VALUES ($1, $2, $3, 'Cash', 'MIGRATION', 'Historical Payment Balance Import')
                    RETURNING id
                `, [
                    validateInt(row.vendor_id, 'vendor_id', row.old_bill_number), 
                    parseFloat(row.amount_paid),
                    row.bill_date || new Date().toISOString()
                ]);

                // 2. Link it via payment_allocations
                await client.query(`
                    INSERT INTO payment_allocations (
                        payment_id, purchase_invoice_id, amount
                    ) VALUES ($1, $2, $3)
                `, [payRes.rows[0].id, billIdRes.rows[0].id, parseFloat(row.amount_paid)]);
            }

            importedCount++;
        }
        await client.query('COMMIT');
        res.json({ success: true, count: importedCount, message: `Imported ${importedCount} vendor bills.` });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// POST /api/migration/customer-advances
router.post('/customer-advances', async (req, res) => {
    const client = await pool.connect();
    try {
        const rows = req.body || [];
        if (!Array.isArray(rows)) return res.status(400).json({ error: "Expected an array" });

        await client.query('BEGIN');
        let importedCount = 0;

        for (const row of rows) {
            await client.query(`
                INSERT INTO customer_payments (
                    customer_id, payment_date, amount, payment_mode, reference_number,
                    status, notes, unallocated_amount, is_advance
                ) VALUES ($1, $2, $3, $4, $5, 'Cleared', 'Historical Advance Import', $3, true)
            `, [
                validateInt(row.customer_id, 'customer_id', `Customer Advance ${row.reference_number}`), row.advance_date || new Date().toISOString(), parseFloat(row.amount) || 0,
                row.payment_mode || 'Cash', row.reference_number || null
            ]);
            importedCount++;
        }
        await client.query('COMMIT');
        res.json({ success: true, count: importedCount, message: `Imported ${importedCount} advances.` });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// POST /api/migration/vendor-advances
router.post('/vendor-advances', async (req, res) => {
    const client = await pool.connect();
    try {
        const rows = req.body || [];
        if (!Array.isArray(rows)) return res.status(400).json({ error: "Expected an array" });

        await client.query('BEGIN');
        let importedCount = 0;

        for (const row of rows) {
            await client.query(`
                INSERT INTO vendor_payments (
                    vendor_id, payment_date, amount, payment_mode, transaction_ref, remarks
                ) VALUES ($1, $2, $3, $4, $5, 'Historical Vendor Advance')
            `, [
                validateInt(row.vendor_id, 'vendor_id', `Vendor Advance ${row.reference_number}`), row.advance_date || new Date().toISOString(), parseFloat(row.amount) || 0,
                row.payment_mode || 'Cash', row.reference_number || null
            ]);
            importedCount++;
        }
        await client.query('COMMIT');
        res.json({ success: true, count: importedCount, message: `Imported ${importedCount} vendor advances.` });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// POST /api/migration/opening-stock
router.post('/opening-stock', async (req, res) => {
    const client = await pool.connect();
    try {
        const rows = req.body || [];
        if (!Array.isArray(rows)) return res.status(400).json({ error: "Expected an array" });

        await client.query('BEGIN');
        let importedCount = 0;

        for (const row of rows) {
            await client.query(`
                INSERT INTO inventory_batches (
                    product_id, batch_code, expiry_date, 
                    quantity_initial, quantity_remaining, 
                    mrp, purchase_rate, distributor_rate, wholesale_rate, dealer_rate, retail_rate,
                    status, created_at
                ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            `, [
                validateInt(row.product_id, 'product_id', `Product Batch ${row.batch_code}`), 
                row.batch_code || 'OPENING-BATCH', 
                row.expiry_date || null,
                parseFloat(row.quantity) || 0, 
                parseFloat(row.mrp) || 0,
                parseFloat(row.purchase_rate) || 0,
                parseFloat(row.distributor_rate) || 0,
                parseFloat(row.wholesale_rate) || 0,
                parseFloat(row.dealer_rate) || 0,
                parseFloat(row.retail_rate) || 0,
                row.status_type || 'Good'
            ]);
            importedCount++;
        }
        await client.query('COMMIT');
        res.json({ success: true, count: importedCount, message: `Imported ${importedCount} inventory batches.` });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

module.exports = router;
