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
            const loanRes = await client.query(`
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
                RETURNING id
            `, [
                loan_number, type, party_type, party_id, party_name,
                total_amount, loan_date, balance_principal, remarks
            ]);

            const loanId = loanRes.rows[0].id;

            // --- [ NEW ] LOAN TRANSACTIONS FOR MIGRATION ---
            // 1. Initial Disbursement (Full Principal)
            await client.query(`
                INSERT INTO loan_transactions (
                    loan_id, transaction_date, amount, principal_portion, interest_portion,
                    transaction_type, payment_mode, reference_no, remarks
                ) VALUES ($1, $2, $3, $4, 0, 'DISBURSEMENT', 'MIGRATION', 'MIGRATION', 'Historical Disbursement')
            `, [loanId, loan_date, total_amount, total_amount]);

            // 2. Already Paid Portion (Settlement)
            if (paid_amount > 0) {
                await client.query(`
                    INSERT INTO loan_transactions (
                        loan_id, transaction_date, amount, principal_portion, interest_portion,
                        transaction_type, payment_mode, reference_no, remarks
                    ) VALUES ($1, $2, $3, $4, 0, 'INSTALLMENT', 'MIGRATION', 'MIGRATION', 'Historical Migration Settlement')
                `, [loanId, loan_date, paid_amount, paid_amount]);
            }

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
            let customerId;
            try {
                customerId = validateInt(row.customer_id, 'customer_id', row.old_invoice_number);
            } catch (e) {
                throw new Error(`Data format error at '${row.old_invoice_number || 'unknown'}': ${e.message}`);
            }

            const oldInvNo = row.old_invoice_number || `OLD-${Date.now()}-${importedCount}`;

            // Search for customer by ID only
            const custRes = await client.query(`
                SELECT id, dse_id, route_id 
                FROM customers 
                WHERE id = $1
            `, [customerId]);

            if (custRes.rows.length === 0) {
                throw new Error(`Migration Error: Customer ID '${customerId}' (for invoice ${oldInvNo}) does not exist in the database. Please import customers first.`);
            }

            // 1. Check if invoice already exists (Idempotency)
            const existRes = await client.query('SELECT id FROM sales_invoices WHERE invoice_number = $1', [oldInvNo]);
            
            const dse_id = custRes.rows[0].dse_id;
            const grand_total = parseFloat(row.grand_total) || 0;
            const amount_paid_val = parseFloat(row.amount_paid || row.paid_amount) || 0;
            
            let invoiceId;
            let existingPaidTotal = 0;

            if (existRes.rows.length > 0) {
                invoiceId = existRes.rows[0].id;
                // Get current allocation sum for robustness (check if payment was already migrated)
                const allocRes = await client.query('SELECT COALESCE(SUM(amount), 0) as total FROM customer_payment_allocations WHERE invoice_id = $1', [invoiceId]);
                existingPaidTotal = parseFloat(allocRes.rows[0].total);
                
                // Update header just in case it was out of sync (idempotent update)
                await client.query(`
                    UPDATE sales_invoices SET 
                        status = $1, paid_amount = $2, amount_paid = $2, grand_total = $3, total_taxable = $3,
                        delivery_status = 'Delivered'
                    WHERE id = $4
                `, [
                    (amount_paid_val >= grand_total && grand_total > 0) ? 'Paid' : 'Unpaid', 
                    amount_paid_val, 
                    grand_total,
                    invoiceId
                ]);
            } else {
                // 2. Insert Sales Invoice Header
                try {
                    const invIdRes = await client.query(`
                        INSERT INTO sales_invoices (
                            customer_id, invoice_number, invoice_date, 
                            grand_total, paid_amount, amount_paid, total_taxable, status,
                            delivery_status
                        ) VALUES ($1, $2, $3, $4, $5, $5, $4, $6, 'Delivered')
                        RETURNING id
                    `, [
                        customerId, 
                        oldInvNo,
                        row.invoice_date || new Date().toISOString().split('T')[0], 
                        grand_total, 
                        amount_paid_val,
                        (amount_paid_val >= grand_total && grand_total > 0) ? 'Paid' : 'Unpaid'
                    ]);
                    invoiceId = invIdRes.rows[0].id;
                } catch (e) {
                    throw new Error(`Database Error inserting invoice '${oldInvNo}': ${e.message}`);
                }
            }

            // 2. Automated Payment Logic: Handle Existing Paid Amount (Backfill if missing)
            const remainingToPay = amount_paid_val - existingPaidTotal;
            if (remainingToPay > 0) {
                try {
                    // A. Create a payment record in customer_payments
                    const payRes = await client.query(`
                        INSERT INTO customer_payments (
                            customer_id, amount, payment_date, payment_mode, 
                            transaction_ref, status, collected_by, verification_status, verified_by
                        ) VALUES ($1, $2, $3, 'Cash', 'MIGRATION', 'Verified', $4, 'Verified', 1)
                        RETURNING id
                    `, [
                        customerId, 
                        remainingToPay, 
                        row.invoice_date || new Date().toISOString().split('T')[0],
                        dse_id
                    ]);

                    const paymentId = payRes.rows[0].id;

                    // B. Create the allocation in customer_payment_allocations
                    await client.query(`
                        INSERT INTO customer_payment_allocations (
                            payment_id, invoice_id, amount
                        ) VALUES ($1, $2, $3)
                    `, [paymentId, invoiceId, remainingToPay]);
                } catch (e) {
                    throw new Error(`Error creating payment allocation for invoice '${oldInvNo}': ${e.message}`);
                }
            }

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

        // --- [ NEW ] AUTOMATED ACCOUNTING SYNC ---
        // 1. Calculate current total value of all Opening Stock
        const valRes = await client.query(`
            SELECT COALESCE(SUM(quantity_remaining * purchase_rate), 0) as total_value 
            FROM inventory_batches 
            WHERE grn_id IS NULL
        `);
        const totalValue = parseFloat(valRes.rows[0].total_value);

        // 2. Identify or Create the Master Opening Journal Entry
        // We look for JE #1303 or any entry with the specific migration description
        const masterDesc = 'Opening Migration: Inventory Catch-up';
        let jeRes = await client.query("SELECT id FROM journal_entries WHERE description = $1", [masterDesc]);
        
        let journalEntryId;
        if (jeRes.rows.length > 0) {
            journalEntryId = jeRes.rows[0].id;
        } else {
            const newJe = await client.query(
                "INSERT INTO journal_entries (transaction_date, description, reference_type) VALUES (NOW(), $1, 'MIGRATION') RETURNING id",
                [masterDesc]
            );
            journalEntryId = newJe.rows[0].id;
        }

        // 3. Resolve Account IDs (Dynamic lookup for robustness)
        const accRes = await client.query("SELECT id, code FROM chart_of_accounts WHERE code IN (1001, 3999)");
        const invAccId = accRes.rows.find(a => a.code == 1001)?.id;
        const offsetAccId = accRes.rows.find(a => a.code == 3999)?.id;

        if (invAccId && offsetAccId) {
            // Delete old lines and insert fresh ones for this entry
            await client.query("DELETE FROM journal_lines WHERE journal_entry_id = $1", [journalEntryId]);
            
            await client.query(`
                INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
                VALUES ($1, $2, $3, 0), ($1, $4, 0, $3)
            `, [journalEntryId, invAccId, totalValue, offsetAccId]);
        }

        await client.query('COMMIT');
        res.json({ 
            success: true, 
            count: importedCount, 
            inventory_value: totalValue,
            message: `Imported ${importedCount} batches. Ledger updated to ₹${totalValue.toLocaleString()}.` 
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Opening Stock Import Error:', err);
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// GET /api/migration/opening-capital
router.get('/opening-capital', async (req, res) => {
    const client = await pool.connect();
    try {
        // 1. Inventory Value (Migrated batches only)
        const invRes = await client.query(`
            SELECT COALESCE(SUM(quantity_remaining * purchase_rate), 0) as value 
            FROM inventory_batches 
            WHERE grn_id IS NULL
        `);

        // 2. Opening Receivables (Migrated invoices only)
        const recRes = await client.query(`
            SELECT COALESCE(SUM(balance_amount), 0) as value 
            FROM sales_invoices 
            WHERE sales_order_id IS NULL AND status != 'Cancelled'
        `);

        // 3. Opening Payables (Migrated purchase invoices minus their allocations)
        const payRes = await client.query(`
            SELECT (
                (SELECT COALESCE(SUM(grand_total), 0) FROM purchase_invoice_headers WHERE purchase_order_id IS NULL AND status != 'Cancelled') -
                (SELECT COALESCE(SUM(amount), 0) FROM payment_allocations WHERE purchase_invoice_id IN (SELECT id FROM purchase_invoice_headers WHERE purchase_order_id IS NULL))
            ) as value
        `);

        // 4. Loans Given
        const loanGivenRes = await client.query(`
            SELECT COALESCE(SUM(balance_principal + balance_interest), 0) as value 
            FROM loans 
            WHERE loan_type = 'GIVEN' AND status = 'Active'
        `);

        // 5. Loans Taken
        const loanTakenRes = await client.query(`
            SELECT COALESCE(SUM(balance_principal + balance_interest), 0) as value 
            FROM loans 
            WHERE loan_type = 'TAKEN' AND status = 'Active'
        `);

        // 6. Fixed Assets (Active assets)
        const assetRes = await client.query(`
            SELECT COALESCE(SUM(purchase_cost), 0) as value 
            FROM assets 
            WHERE status NOT IN ('Sold', 'Scrapped')
        `);

        // 7. Bank & Cash Balances
        const bankRes = await client.query(`
            SELECT COALESCE(SUM(current_balance), 0) as value 
            FROM bank_accounts 
            WHERE is_active = true
        `);

        const inventory = parseFloat(invRes.rows[0].value);
        const receivables = parseFloat(recRes.rows[0].value);
        const loansGiven = parseFloat(loanGivenRes.rows[0].value);
        const fixedAssets = parseFloat(assetRes.rows[0].value);
        const bankCash = parseFloat(bankRes.rows[0].value);

        const payables = parseFloat(payRes.rows[0].value);
        const loansTaken = parseFloat(loanTakenRes.rows[0].value);

        const totalAssets = inventory + receivables + loansGiven + fixedAssets + bankCash;
        const totalLiabilities = payables + loansTaken;
        const openingCapital = totalAssets - totalLiabilities;

        res.json({
            assets: {
                inventory,
                receivables,
                loans_given: loansGiven,
                fixed_assets: fixedAssets,
                bank_cash: bankCash,
                total_assets: totalAssets
            },
            liabilities: {
                payables,
                loans_taken: loansTaken,
                total_liabilities: totalLiabilities
            },
            opening_capital: openingCapital
        });

    } catch (err) {
        console.error('Opening Capital Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
