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
            vendor_id,
            remarks
        } = req.body;

        await client.query('BEGIN');

        // 1. Insert into Assets Table
        const assetRes = await client.query(`
            INSERT INTO assets (
                asset_name, category, purchase_date, purchase_cost, 
                useful_life_years, salvage_value, asset_account_code, vendor_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `, [asset_name, category, purchase_date, purchase_cost, useful_life_years, salvage_value, asset_account_code, vendor_id]);

        const assetId = assetRes.rows[0].id;

        // 2. Accounting Entry (Always Credit Purchase)
        const acc_asset = asset_account_code;
        const acc_ap = 2001;

        const ledgerLines = [
            { code: acc_asset, debit: Number(purchase_cost), credit: 0 },
            { code: acc_ap, debit: 0, credit: Number(purchase_cost) }
        ];

        const description = `Asset Purchase (Credit): ${asset_name} (${category})`;
        const journalId = await client.query(`SELECT create_journal_entry($1, $2, $3, $4, $5)`,
            [purchase_date, description, 'ASSET_PURCHASE', assetId, JSON.stringify(ledgerLines)]);

        // 3. Record Asset Transaction
        await client.query(`
            INSERT INTO asset_transactions (asset_id, transaction_type, transaction_date, amount, journal_entry_id, remarks)
            VALUES ($1, 'PURCHASE', $2, $3, $4, $5)
        `, [assetId, purchase_date, purchase_cost, journalId.rows[0].create_journal_entry, remarks]);

        await client.query('COMMIT');
        res.status(201).json({ success: true, asset_id: assetId });

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
                COALESCE((SELECT SUM(amount) FROM asset_transactions WHERE asset_id = a.id AND transaction_type = 'DEPRECIATION'), 0) as total_depreciation,
                COALESCE((SELECT SUM(amount) FROM asset_transactions WHERE asset_id = a.id AND transaction_type = 'PAYMENT'), 0) as total_paid,
                (a.purchase_cost - COALESCE((SELECT SUM(amount) FROM asset_transactions WHERE asset_id = a.id AND transaction_type = 'DEPRECIATION'), 0)) as net_book_value,
                (a.purchase_cost - COALESCE((SELECT SUM(amount) FROM asset_transactions WHERE asset_id = a.id AND transaction_type = 'PAYMENT'), 0)) as balance_payable
            FROM assets a
            ORDER BY a.purchase_date DESC
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

// @route   POST /api/finance/assets/:id/sale
// @desc    Record sale or disposal of an asset
router.post('/:id/sale', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { sale_date, sale_amount, payment_mode, bank_account_id, remarks } = req.body;

        await client.query('BEGIN');

        // 1. Get Asset Info & Total Dep
        const assetRes = await client.query(`
            SELECT a.*, 
                COALESCE((SELECT SUM(amount) FROM asset_transactions WHERE asset_id = a.id AND transaction_type = 'DEPRECIATION'), 0) as total_dep
            FROM assets a WHERE a.id = $1
        `, [id]);

        if (assetRes.rows.length === 0) throw new Error('Asset not found');
        const asset = assetRes.rows[0];
        const cost = Number(asset.purchase_cost);
        const accumDep = Number(asset.total_dep);
        const bv = cost - accumDep;
        const proceeds = Number(sale_amount);
        const gainLoss = proceeds - bv;

        // 2. Accounting Entry
        const acc_asset = asset.asset_account_code;
        const acc_accum_dep = asset.accum_dep_account_code || 1210;
        const acc_bank = 1002;
        const acc_cash = 1003;
        const acc_gain = 4010;
        const acc_loss = 5021;

        let debitAcc = (payment_mode === 'Cash') ? acc_cash : acc_bank;
        let ledgerLines = [
            { code: debitAcc, debit: proceeds, credit: 0, bank_account_id: (payment_mode === 'Bank' || payment_mode === 'Online') ? bank_account_id : null },
            { code: acc_accum_dep, debit: accumDep, credit: 0 },
            { code: acc_asset, debit: 0, credit: cost }
        ];

        if (gainLoss > 0) {
            ledgerLines.push({ code: acc_gain, debit: 0, credit: gainLoss });
        } else if (gainLoss < 0) {
            ledgerLines.push({ code: acc_loss, debit: Math.abs(gainLoss), credit: 0 });
        }

        const journalRes = await client.query(`SELECT create_journal_entry($1, $2, $3, $4, $5)`,
            [sale_date, `Sale of Asset: ${asset.asset_name}`, 'ASSET_SALE', id, JSON.stringify(ledgerLines)]);

        const journalId = journalRes.rows[0].create_journal_entry;

        // 3. Mark Asset as Sold
        await client.query('UPDATE assets SET status = $1 WHERE id = $2', ['Sold', id]);

        // 4. Record Transaction
        await client.query(`
            INSERT INTO asset_transactions (asset_id, transaction_type, transaction_date, amount, journal_entry_id, remarks)
            VALUES ($1, 'SALE', $2, $3, $4, $5)
        `, [id, sale_date, proceeds, journalId, remarks]);

        await client.query('COMMIT');
        res.json({ success: true, gain_loss: gainLoss });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   POST /api/finance/assets/payment
// @desc    Record payment for an asset (Unified Modes: Cash, Online, Cheque)
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
            remarks
        } = req.body;

        await client.query('BEGIN');

        // 1. Get Asset Info
        const assetRes = await client.query('SELECT asset_name FROM assets WHERE id = $1', [asset_id]);
        if (assetRes.rows.length === 0) throw new Error('Asset not found');
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
            { code: creditAcc, debit: 0, credit: Number(amount), bank_account_id: (payment_mode !== 'Cash') ? bank_account_id : null }
        ];

        const description = `Asset Payment (${payment_mode}): ${assetName}`;
        const journalRes = await client.query(`SELECT create_journal_entry($1, $2, $3, $4, $5)`,
            [payment_date, description, 'ASSET_PAYMENT', asset_id, JSON.stringify(ledgerLines)]);

        const journalId = journalRes.rows[0].create_journal_entry;

        // 3. Record Transaction in asset_transactions
        await client.query(`
            INSERT INTO asset_transactions (asset_id, transaction_type, transaction_date, amount, journal_entry_id, remarks)
            VALUES ($1, 'PAYMENT', $2, $3, $4, $5)
        `, [asset_id, payment_date, amount, journalId, remarks]);

        // 4. Handle Online (Bank Statement Consumption)
        if (payment_mode === 'Online' && bank_statement_entry_id) {
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = COALESCE(consumed_amount, 0) + $1,
                    status = CASE 
                        WHEN (debit_amount - (COALESCE(consumed_amount, 0) + $1)) <= 0.01 THEN 'Exhausted'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [amount, bank_statement_entry_id]);
        }

        // 5. Handle Cheque Entry
        if (payment_mode === 'Cheque') {
            await client.query(`
                INSERT INTO cheques (
                    cheque_number, cheque_date, bank_name, amount, 
                    type, party_type, reference_type, reference_id, status
                ) VALUES ($1, $2, $3, $4, 'OUTGOING', 'VENDOR', 'ASSET_PAYMENT', $5, 'PENDING')
            `, [cheque_no, cheque_date || payment_date, bank_name || 'Own Bank', amount, asset_id]);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Payment recorded' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Asset Payment Error:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
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
