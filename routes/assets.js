const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// @route   POST /api/finance/assets
// @desc    Record an asset purchase
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
            payment_mode, // 'Bank', 'Cash', 'Credit'
            bank_account_id,
            vendor_id,
            transaction_ref,
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

        // 2. Prepare Accounting Entry
        const acc_asset = asset_account_code;
        const acc_bank = 1002;
        const acc_cash = 1003;
        const acc_ap = 2001;

        let creditAcc = acc_bank;
        if (payment_mode === 'Cash') creditAcc = acc_cash;
        if (payment_mode === 'Credit') creditAcc = acc_ap;

        const ledgerLines = [
            { code: acc_asset, debit: Number(purchase_cost), credit: 0 },
            { code: creditAcc, debit: 0, credit: Number(purchase_cost), bank_account_id: (payment_mode === 'Bank') ? bank_account_id : null }
        ];

        const description = `Asset Purchase: ${asset_name} (${category})`;
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
                (a.purchase_cost - COALESCE((SELECT SUM(amount) FROM asset_transactions WHERE asset_id = a.id AND transaction_type = 'DEPRECIATION'), 0)) as net_book_value
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
            { code: debitAcc, debit: proceeds, credit: 0, bank_account_id: (payment_mode === 'Bank') ? bank_account_id : null },
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

module.exports = router;
