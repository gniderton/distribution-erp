const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// @route   POST /api/finance/assets
// @desc    Record an asset purchase (Always on Credit)
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            asset_name,
            category,
            purchase_date,
            purchase_cost,
            useful_life_years,
            salvage_value,
            asset_account_code,
            vendor_id,           // Still accepting as vendor_id from UI
            purchase_entity_id,  // Or purchase_entity_id
            remarks,
            is_gst_purchase,     
            taxable_amount,      
            tax_amount,          
            gst_no,              
            bill_no,             
            created_by           
        } = req.body;

        const effective_purchase_entity_id = purchase_entity_id || vendor_id;

        await client.query('BEGIN');

        // 0. Generate Asset Purchase Number
        const seqRes = await client.query(`
            UPDATE document_sequences
            SET current_number = current_number + 1
            WHERE document_type = 'ASSET_PURCHASE'
            RETURNING prefix || LPAD(current_number::text, 4, '0') as purchase_no
        `);
        const assetPurchaseNo = seqRes.rows[0]?.purchase_no || `ASP-TMP-${Date.now()}`;

        // 1. Insert into Assets Table
        const assetRes = await client.query(`
            INSERT INTO assets (
                asset_name, category, purchase_date, purchase_cost, 
                useful_life_years, salvage_value, asset_account_code, 
                vendor_id, purchase_entity_id,
                is_gst_purchase, taxable_amount, tax_amount, gst_no, bill_no, created_by,
                asset_purchase_no
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id
        `, [
            asset_name, category, purchase_date, purchase_cost,
            useful_life_years, salvage_value, asset_account_code, 
            effective_purchase_entity_id, effective_purchase_entity_id,
            is_gst_purchase || false, taxable_amount || 0, tax_amount || 0, gst_no, bill_no, created_by,
            assetPurchaseNo
        ]);

        const assetId = assetRes.rows[0].id;

        // 2. Accounting Entry (Always Credit Purchase)
        const acc_asset = asset_account_code;
        const acc_ap = 2001;
        const acc_cgst = 1011;
        const acc_sgst = 1012;

        const ledgerLines = [];

        if (is_gst_purchase && Number(tax_amount) > 0) {
            // Split entry for GST
            ledgerLines.push({ code: acc_asset, debit: Number(taxable_amount), credit: 0 });
            const halfTax = Number(tax_amount) / 2;
            ledgerLines.push({ code: acc_cgst, debit: halfTax, credit: 0 });
            ledgerLines.push({ code: acc_sgst, debit: halfTax, credit: 0 });
            ledgerLines.push({ code: acc_ap, debit: 0, credit: Number(purchase_cost) });
        } else {
            // Simple entry
            ledgerLines.push({ code: acc_asset, debit: Number(purchase_cost), credit: 0 });
            ledgerLines.push({ code: acc_ap, debit: 0, credit: Number(purchase_cost) });
        }

        const description = `Asset Purchase (Credit): ${asset_name} ${bill_no ? '(Bill: ' + bill_no + ')' : ''}`;
        const journalId = await client.query(`SELECT create_journal_entry($1, $2, $3, $4, $5)`,
            [purchase_date, description, 'ASSET_PURCHASE', assetId, JSON.stringify(ledgerLines)]);

        // 3. Record Asset Transaction
        await client.query(`
            INSERT INTO asset_transactions (asset_id, transaction_type, transaction_date, amount, journal_entry_id, remarks)
            VALUES ($1, 'PURCHASE', $2, $3, $4, $5)
        `, [assetId, purchase_date, purchase_cost, journalId.rows[0].create_journal_entry, remarks]);

        await client.query('COMMIT');
        res.status(201).json({ success: true, asset_id: assetId, asset_purchase_no: assetPurchaseNo });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Asset Purchase Error:', err.message);
        res.status(500).json({ error: 'Server Error recording asset purchase', details: err.message });
    } finally {
        client.release();
    }
});

// @route   GET /api/finance/assets
// @desc    List all assets with Net Book Value
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                a.*,
                pe.entity_name as purchase_vendor_name,
                pe.gst_number as purchase_vendor_gst,
                se.entity_name as sale_customer_name,
                se.gst_number as sale_customer_gst,
                COALESCE((SELECT SUM(amount) FROM asset_transactions WHERE asset_id = a.id AND transaction_type = 'DEPRECIATION'), 0) as total_depreciation,
                COALESCE((SELECT SUM(amount) FROM asset_transactions WHERE asset_id = a.id AND transaction_type = 'PAYMENT'), 0) as total_paid,
                (a.purchase_cost - COALESCE((SELECT SUM(amount) FROM asset_transactions WHERE asset_id = a.id AND transaction_type = 'DEPRECIATION'), 0)) as net_book_value,
                (a.purchase_cost - COALESCE((SELECT SUM(amount) FROM asset_transactions WHERE asset_id = a.id AND transaction_type = 'PAYMENT'), 0)) as balance_payable
            FROM assets a
            LEFT JOIN asset_entities pe ON a.purchase_entity_id = pe.id
            LEFT JOIN asset_entities se ON a.sale_entity_id = se.id
            ORDER BY a.purchase_date DESC, a.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/finance/assets/depreciate
// @desc    Record depreciation for an asset
router.post('/depreciate', async (req, res) => {
    const client = await pool.connect();
    try {
        const { asset_id, amount, transaction_date, remarks } = req.body;

        await client.query('BEGIN');

        // 1. Check current BV
        const assetRes = await client.query('SELECT asset_name, accum_dep_account_code FROM assets WHERE id = $1', [asset_id]);
        if (assetRes.rows.length === 0) throw new Error('Asset not found');
        const asset = assetRes.rows[0];

        // 2. Accounting Entry
        const acc_dep_exp = 5020;
        const acc_accum_dep = asset.accum_dep_account_code || 1210;

        const ledgerLines = [
            { code: acc_dep_exp, debit: Number(amount), credit: 0 },
            { code: acc_accum_dep, debit: 0, credit: Number(amount) }
        ];

        const description = `Depreciation: ${asset.asset_name}`;
        const journalRes = await client.query(`SELECT create_journal_entry($1, $2, $3, $4, $5)`,
            [transaction_date, description, 'DEPRECIATION', asset_id, JSON.stringify(ledgerLines)]);

        const journalId = journalRes.rows[0].create_journal_entry;

        // 3. Record Transaction
        await client.query(`
            INSERT INTO asset_transactions (asset_id, transaction_type, transaction_date, amount, journal_entry_id, remarks)
            VALUES ($1, 'DEPRECIATION', $2, $3, $4, $5)
        `, [asset_id, transaction_date, amount, journalId, remarks]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Depreciation recorded' });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   POST /api/finance/assets/auto-depreciate
// @desc    Bulk record monthly depreciation for all active assets
router.post('/auto-depreciate', async (req, res) => {
    const client = await pool.connect();
    try {
        const { period_date } = req.body; // e.g. "2026-02-28" - represents the month
        if (!period_date) return res.status(400).json({ error: 'Period date is required' });

        const date = new Date(period_date);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        await client.query('BEGIN');

        // 1. Get all active assets
        const assetsRes = await client.query(`
            SELECT id, asset_name, purchase_cost, salvage_value, useful_life_years, accum_dep_account_code
            FROM assets 
            WHERE status = 'Active'
        `);

        let count = 0;
        let totalAmount = 0;

        for (const asset of assetsRes.rows) {
            // 2. Check if already depreciated for this month/year
            const checkRes = await client.query(`
                SELECT id FROM asset_transactions 
                WHERE asset_id = $1 
                  AND transaction_type = 'DEPRECIATION'
                  AND EXTRACT(MONTH FROM transaction_date) = $2
                  AND EXTRACT(YEAR FROM transaction_date) = $3
            `, [asset.id, month, year]);

            if (checkRes.rows.length > 0) continue; // Skip if already done

            // 3. Calculate Monthly Depreciation (Straight Line)
            const monthlyDep = (Number(asset.purchase_cost) - Number(asset.salvage_value || 0)) / (Number(asset.useful_life_years) * 12);
            const amount = Number(monthlyDep.toFixed(2));

            if (amount <= 0) continue;

            // 4. Accounting Entry
            const acc_dep_exp = 5020;
            const acc_accum_dep = asset.accum_dep_account_code || 1210;
            const ledgerLines = [
                { code: acc_dep_exp, debit: amount, credit: 0 },
                { code: acc_accum_dep, debit: 0, credit: amount }
            ];

            const description = `Auto-Depreciation (${month}/${year}): ${asset.asset_name}`;
            const journalRes = await client.query(`SELECT create_journal_entry($1, $2, $3, $4, $5)`,
                [period_date, description, 'DEPRECIATION', asset.id, JSON.stringify(ledgerLines)]);

            // 5. Transaction Record
            await client.query(`
                INSERT INTO asset_transactions (asset_id, transaction_type, transaction_date, amount, journal_entry_id, remarks)
                VALUES ($1, 'DEPRECIATION', $2, $3, $4, 'Auto-generated bulk entry')
            `, [asset.id, period_date, amount, journalRes.rows[0].create_journal_entry]);

            count++;
            totalAmount += amount;
        }

        await client.query('COMMIT');
        res.json({ success: true, assets_processed: count, total_amount: totalAmount.toFixed(2) });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Auto-Depreciation Error:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   POST /api/finance/assets/payment
// @desc    Record payment for an asset purchase (Unified Modes: Cash, Online, Cheque)
router.post('/payment', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            asset_id,
            amount,
            payment_date,
            payment_mode,
            bank_account_id,
            bank_statement_entry_id,
            cheque_no,
            cheque_date,
            bank_name,
            bank_id,             // Added
            remarks
        } = req.body;

        let resolvedBankAccountId = bank_account_id;

        // 🚀 SMART AUTO-RESOLUTION: Derive bank account from statement entry if provided
        if (payment_mode !== 'Cheque' && bank_statement_entry_id) {
            const bRes = await client.query('SELECT bank_account_id FROM bank_statement_entries WHERE id = $1', [bank_statement_entry_id]);
            if (bRes.rows.length === 0) {
                return res.status(400).json({ error: `Bank statement entry ID ${bank_statement_entry_id} not found` });
            }
            resolvedBankAccountId = bRes.rows[0].bank_account_id;
            console.log(`[Smart Asset Purchase Payment] Resolved bank_account_id from ${bank_account_id} to ${resolvedBankAccountId} via statement entry`);
        }

        await client.query('BEGIN');

        // 1. Get Asset Info
        const parsedAssetId = parseInt(asset_id);
        const assetRes = await client.query('SELECT asset_name FROM assets WHERE id = $1', [parsedAssetId]);

        if (assetRes.rows.length === 0) {
            console.error(`Asset not found for ID: ${asset_id} (parsed: ${parsedAssetId})`);
            return res.status(400).json({ error: 'Asset not found', asset_id: asset_id });
        }
        const assetName = assetRes.rows[0].asset_name;

        // 2. Accounting Entry
        const acc_ap = 2001;
        const acc_bank = 1002;
        const acc_cash = 1003;
        const acc_chq_issued = 2004;

        let creditAcc = acc_bank;
        if (payment_mode === 'Cash') creditAcc = acc_cash;
        if (payment_mode === 'Cheque') creditAcc = acc_chq_issued;

        const ledgerLines = [
            { code: acc_ap, debit: Number(amount), credit: 0 },
            { code: creditAcc, debit: 0, credit: Number(amount), bank_account_id: (payment_mode !== 'Cash') ? resolvedBankAccountId : null }
        ];

        const description = `Asset Purchase Payment (${payment_mode}): ${assetName}`;
        const journalRes = await client.query(`SELECT create_journal_entry($1, $2, $3, $4, $5)`,
            [payment_date, description, 'ASSET_PAYMENT', asset_id, JSON.stringify(ledgerLines)]);

        const journalId = journalRes.rows[0].create_journal_entry;

        // 3. Record Transaction in asset_transactions
        await client.query(`
            INSERT INTO asset_transactions (asset_id, transaction_type, transaction_date, amount, journal_entry_id, remarks, bank_statement_entry_id)
            VALUES ($1, 'PAYMENT', $2, $3, $4, $5, $6)
        `, [asset_id, payment_date, amount, journalId, remarks, bank_statement_entry_id]);

        // 4. Handle Online (Bank Statement Consumption)
        if (payment_mode && payment_mode.toUpperCase() === 'ONLINE' && bank_statement_entry_id) {
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = COALESCE(consumed_amount, 0) + $1,
                    status = CASE 
                        WHEN (amount - (COALESCE(consumed_amount, 0) + $1)) <= 0.01 THEN 'Exhausted'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [amount, bank_statement_entry_id]);
        }

        // 5. Handle Cheque Entry
        if (payment_mode === 'Cheque') {
            await client.query(`
                INSERT INTO cheques (
                    cheque_number, cheque_date, bank_name, bank_id, amount, 
                    type, party_type, reference_type, reference_id, status
                ) VALUES ($1, $2, $3, $4, $5, 'OUTGOING', 'VENDOR', 'ASSET_PAYMENT', $6, 'PENDING')
            `, [
                cheque_no, 
                cheque_date || payment_date, 
                bank_name || 'Own Bank', 
                (bank_id === 'undefined' || !bank_id) ? null : bank_id,
                amount, 
                asset_id
            ]);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Payment recorded' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Asset Payment Error:', err.message);
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   GET /api/assets/ping
// @desc    Check if assets API is active
router.get('/ping', (req, res) => {
    res.json({ status: 'Asset API Active', timestamp: new Date() });
});

// @route   POST /api/finance/assets/:id/sale-payment
// @desc    Record payment received for a sold asset
router.post('/:id/sale-payment', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const {
            amount,
            payment_date,
            payment_mode,
            bank_account_id,
            bank_statement_entry_id,
            cheque_no,
            cheque_date,
            bank_name,
            bank_id, // Added
            remarks,
            online_reference_no  // Added
        } = req.body;

        await client.query('BEGIN');

        // 1. Get Asset Info
        const assetRes = await client.query('SELECT asset_name, sale_balance_receivable FROM assets WHERE id = $1', [id]);
        if (assetRes.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });

        const asset = assetRes.rows[0];

        // 2. Accounting Entry (Debit Bank/Cash, Credit AR)
        const acc_ar = 1001;
        const acc_bank = 1002;
        const acc_cash = 1003;
        const acc_chq_in_hand = 1005;

        let debitAcc = acc_bank;
        if (payment_mode === 'Cash') debitAcc = acc_cash;
        if (payment_mode === 'Cheque') debitAcc = acc_chq_in_hand;

        const ledgerLines = [
            { code: debitAcc, debit: Number(amount), credit: 0, bank_account_id: (payment_mode !== 'Cash' && payment_mode !== 'Cheque') ? bank_account_id : null },
            { code: acc_ar, debit: 0, credit: Number(amount) }
        ];

        const description = `Asset Sale Payment (${payment_mode})${online_reference_no ? ' Ref: ' + online_reference_no : ''}: ${asset.asset_name}`;
        const journalRes = await client.query(`SELECT create_journal_entry($1, $2, $3, $4, $5)`,
            [payment_date, description, 'ASSET_SALE_PAYMENT', id, JSON.stringify(ledgerLines)]);

        const journalId = journalRes.rows[0].create_journal_entry;

        // 3. Update Asset Receivable Balance
        await client.query(`
            UPDATE assets 
            SET sale_balance_receivable = sale_balance_receivable - $1 
            WHERE id = $2
        `, [amount, id]);

        // 4. Record Transaction
        await client.query(`
            INSERT INTO asset_transactions (asset_id, transaction_type, transaction_date, amount, journal_entry_id, remarks, bank_statement_entry_id)
            VALUES ($1, 'SALE_PAYMENT', $2, $3, $4, $5, $6)
        `, [id, payment_date, amount, journalId, `${remarks || ''}${online_reference_no ? ' (Ref: ' + online_reference_no + ')' : ''}`.trim(), bank_statement_entry_id]);

        // 5. Handle Bank Statement (Reconciliation)
        if (payment_mode && payment_mode.toUpperCase() === 'ONLINE' && bank_statement_entry_id) {
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = COALESCE(consumed_amount, 0) + $1,
                    status = CASE 
                        WHEN (credit_amount - (COALESCE(consumed_amount, 0) + $1)) <= 0.01 THEN 'Exhausted'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [amount, bank_statement_entry_id]);
        }

        // 6. Handle Cheque Entry (Incoming)
        if (payment_mode === 'Cheque') {
            await client.query(`
                INSERT INTO cheques (
                    cheque_number, cheque_date, bank_name, bank_id, amount, 
                    type, party_type, reference_type, reference_id, status
                ) VALUES ($1, $2, $3, $4, $5, 'INCOMING', 'CUSTOMER', 'ASSET_SALE_PAYMENT', $6, 'PENDING')
            `, [cheque_no, cheque_date || payment_date, bank_name, bank_id, amount, id]);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Sale payment recorded' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Asset Sale Payment Error:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   POST /api/finance/assets/:id/sale
// @desc    Record sale or disposal of an asset (Always on Credit)
router.post('/:id/sale', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const {
            sale_date,
            sale_amount,
            remarks,
            sale_buyer_name,
            sale_buyer_gst,
            sale_entity_id,       // Added
            sale_is_gst,
            sale_taxable_amount,
            sale_tax_amount,
            sale_hsn_code,
            sale_buyer_address,    
            sale_delivery_address,   
            created_by            
        } = req.body;

        if (!sale_date) return res.status(400).json({ error: 'Sale date is required' });

        await client.query('BEGIN');

        // 1. Generate Auto Invoice Number
        const seqRes = await client.query(`
            UPDATE document_sequences
            SET current_number = current_number + 1
            WHERE document_type = 'ASSET_SALE_INV'
            RETURNING prefix || LPAD(current_number::text, 4, '0') as invoice_no
        `);
        if (seqRes.rows.length === 0) throw new Error('Sequence for ASSET_SALE_INV not found');
        const sale_invoice_no = seqRes.rows[0].invoice_no;

        // 2. Get Asset Info & Total Dep
        const assetRes = await client.query(`
            SELECT a.*,
                COALESCE((SELECT SUM(amount) FROM asset_transactions WHERE asset_id = a.id AND transaction_type = 'DEPRECIATION'), 0) as total_dep
            FROM assets a WHERE a.id = $1
        `, [id]);

        if (assetRes.rows.length === 0) {
            return res.status(400).json({ error: 'Asset not found', asset_id: id });
        }
        const asset = assetRes.rows[0];
        const cost = Number(asset.purchase_cost);
        const accumDep = Number(asset.total_dep);
        const bv = cost - accumDep;
        const proceeds = Number(sale_amount);

        // Use Taxable Amount for Gain/Loss calculation if GST is involved
        const netProceeds = sale_is_gst ? Number(sale_taxable_amount) : proceeds;
        const gainLoss = netProceeds - bv;

        // 3. Accounting Entry (Debit AR)
        const acc_asset = asset.asset_account_code;
        const acc_accum_dep = asset.accum_dep_account_code || 1210;
        const acc_ar = 1001;
        const acc_gain = 4010;
        const acc_loss = 5021;
        const acc_cgst_out = 2011;
        const acc_sgst_out = 2012;

        let ledgerLines = [
            { code: acc_ar, debit: proceeds, credit: 0 },
            { code: acc_accum_dep, debit: accumDep, credit: 0 },
            { code: acc_asset, debit: 0, credit: cost }
        ];

        // Handle GST Output
        if (sale_is_gst && Number(sale_tax_amount) > 0) {
            const halfTax = Number(sale_tax_amount) / 2;
            ledgerLines.push({ code: acc_cgst_out, debit: 0, credit: halfTax });
            ledgerLines.push({ code: acc_sgst_out, debit: 0, credit: halfTax });
        }

        // Handle Gain/Loss
        if (gainLoss > 0) {
            ledgerLines.push({ code: acc_gain, debit: 0, credit: gainLoss });
        } else if (gainLoss < 0) {
            ledgerLines.push({ code: acc_loss, debit: Math.abs(gainLoss), credit: 0 });
        }

        const journalRes = await client.query(`SELECT create_journal_entry($1, $2, $3, $4, $5)`,
            [sale_date, `Asset Sale (Credit): ${asset.asset_name} (Inv: ${sale_invoice_no})`, 'ASSET_SALE', id, JSON.stringify(ledgerLines)]);

        const journalId = journalRes.rows[0].create_journal_entry;

        // 4. Mark Asset as Sold & Save Buyer/GST Details
        await client.query(`
            UPDATE assets SET
                status = $1,
                sale_buyer_name = $3,
                sale_buyer_gst = $4,
                sale_is_gst = $5,
                sale_taxable_amount = $6,
                sale_tax_amount = $7,
                sale_invoice_no = $8,
                sale_invoice_number = $8,
                sale_total_amount = $9,
                sale_balance_receivable = $9,
                sale_hsn_code = $10,
                sale_buyer_address = $11,
                sale_delivery_address = $12,
                sale_created_by = $13,
                sale_entity_id = $14
            WHERE id = $2
        `, [
            'Sold', id,
            sale_buyer_name, sale_buyer_gst, sale_is_gst || false,
            sale_taxable_amount || 0, sale_tax_amount || 0, sale_invoice_no,
            proceeds, sale_hsn_code, sale_buyer_address, sale_delivery_address,
            created_by, sale_entity_id
        ]);

        // 5. Record Transaction
        await client.query(`
            INSERT INTO asset_transactions (asset_id, transaction_type, transaction_date, amount, journal_entry_id, remarks)
            VALUES ($1, 'SALE', $2, $3, $4, $5)
        `, [id, sale_date, proceeds, journalId, remarks]);

        await client.query('COMMIT');
        res.json({ success: true, gain_loss: gainLoss, invoice_no: sale_invoice_no });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Asset Sale Error:', err.message);
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   POST /api/finance/assets/:id/sale-payment
// @desc    Record payment received for a sold asset
router.post('/:id/sale-payment', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const {
            amount,
            payment_date,
            payment_mode,
            bank_account_id,
            bank_statement_entry_id,
            cheque_no,
            cheque_date,
            bank_name,
            bank_id,
            remarks,
            online_reference_no  // Added
        } = req.body;

        let resolvedBankAccountId = bank_account_id;

        // 🚀 SMART AUTO-RESOLUTION: Derive bank account from statement entry if provided
        if (payment_mode !== 'Cheque' && bank_statement_entry_id) {
            const bRes = await client.query('SELECT bank_account_id FROM bank_statement_entries WHERE id = $1', [bank_statement_entry_id]);
            if (bRes.rows.length === 0) {
                return res.status(400).json({ error: `Bank statement entry ID ${bank_statement_entry_id} not found` });
            }
            resolvedBankAccountId = bRes.rows[0].bank_account_id;
            console.log(`[Smart Asset Sale Payment] Resolved bank_account_id from ${bank_account_id} to ${resolvedBankAccountId} via statement entry`);
        }

        await client.query('BEGIN');

        // 1. Get Asset Info
        const assetRes = await client.query('SELECT asset_name, sale_balance_receivable FROM assets WHERE id = $1', [id]);
        if (assetRes.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });

        const asset = assetRes.rows[0];

        // 2. Accounting Entry (Debit Bank/Cash, Credit AR)
        const acc_ar = 1001;
        const acc_bank = 1002;
        const acc_cash = 1003;
        const acc_chq_in_hand = 1005;

        let debitAcc = acc_bank;
        if (payment_mode === 'Cash') debitAcc = acc_cash;
        if (payment_mode === 'Cheque') debitAcc = acc_chq_in_hand;

        const ledgerLines = [
            { code: debitAcc, debit: Number(amount), credit: 0, bank_account_id: (payment_mode !== 'Cash' && payment_mode !== 'Cheque') ? resolvedBankAccountId : null },
            { code: acc_ar, debit: 0, credit: Number(amount) }
        ];

        const description = `Asset Sale Payment (${payment_mode})${online_reference_no ? ' Ref: ' + online_reference_no : ''}: ${asset.asset_name}`;
        const journalRes = await client.query(`SELECT create_journal_entry($1, $2, $3, $4, $5)`,
            [payment_date, description, 'ASSET_SALE_PAYMENT', id, JSON.stringify(ledgerLines)]);

        const journalId = journalRes.rows[0].create_journal_entry;

        // 3. Update Asset Receivable Balance
        await client.query(`
            UPDATE assets 
            SET sale_balance_receivable = sale_balance_receivable - $1 
            WHERE id = $2
        `, [amount, id]);

        // 4. Record Transaction
        await client.query(`
            INSERT INTO asset_transactions (asset_id, transaction_type, transaction_date, amount, journal_entry_id, remarks)
            VALUES ($1, 'SALE_PAYMENT', $2, $3, $4, $5)
        `, [id, payment_date, amount, journalId, `${remarks || ''}${online_reference_no ? ' (Ref: ' + online_reference_no + ')' : ''}`.trim()]);

        // 5. Handle Bank Statement (Reconciliation)
        if (payment_mode && payment_mode.toUpperCase() === 'ONLINE' && bank_statement_entry_id) {
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = COALESCE(consumed_amount, 0) + $1,
                    status = CASE 
                        WHEN (amount - (COALESCE(consumed_amount, 0) + $1)) <= 0.01 THEN 'Exhausted'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [amount, bank_statement_entry_id]);
        }

        // 6. Handle Cheque Entry (Incoming)
        if (payment_mode === 'Cheque') {
            await client.query(`
                INSERT INTO cheques (
                    cheque_number, cheque_date, bank_name, bank_id, amount, 
                    type, party_type, reference_type, reference_id, status
                ) VALUES ($1, $2, $3, $4, $5, 'INCOMING', 'CUSTOMER', 'ASSET_SALE_PAYMENT', $6, 'PENDING')
            `, [cheque_no, cheque_date || payment_date, bank_name, bank_id, amount, id]);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Sale payment recorded' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Asset Sale Payment Error:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   GET /api/finance/assets/depreciations
// @desc    Get all depreciation transactions
router.get('/depreciations', async (req, res) => {
    try {
        const { asset_id } = req.query;
        let query = `
            SELECT at.*, a.asset_name
            FROM asset_transactions at
            JOIN assets a ON at.asset_id = a.id
            WHERE at.transaction_type = 'DEPRECIATION'
        `;
        const params = [];
        if (asset_id) {
            params.push(asset_id);
            query += ` AND at.asset_id = $${params.length}`;
        }
        query += ` ORDER BY at.transaction_date DESC, at.id DESC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/finance/assets/categories
// @desc    Get list of asset categories
router.get('/categories', async (req, res) => {
    res.json(['Vehicles', 'Machinery', 'Furniture', 'Electronics', 'Buildings', 'Land', 'Software']);
});

// @route   GET /api/finance/assets/accounts
// @desc    Get asset-related accounts from COA
router.get('/accounts', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, code, name 
            FROM chart_of_accounts 
            WHERE type = 'ASSET' AND code BETWEEN 1200 AND 1299
            ORDER BY code ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
