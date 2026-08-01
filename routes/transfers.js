const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// @route   POST /api/finance/transfers
// @desc    Record an internal transfer between accounts (Cash to Bank, Bank to Bank, Bank to Cash)
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            from_account_id,
            to_account_id,
            amount,
            transfer_date,
            payment_mode,
            reference_no,
            remarks,
            from_bank_statement_entry_id, // Linked debit entry (for Bank to Bank/Cash)
            to_bank_statement_entry_id,   // Linked credit entry (for Cash/Bank to Bank)
            denominations                // Cash denominations JSON
        } = req.body;

        let resolvedFromId = from_account_id;
        let resolvedToId = to_account_id;

        // 🚀 SMART AUTO-RESOLUTION: Derive source account from statement entry if provided
        if (from_bank_statement_entry_id) {
            const bRes = await client.query('SELECT bank_account_id FROM bank_statement_entries WHERE id = $1', [from_bank_statement_entry_id]);
            if (bRes.rows.length === 0) {
                return res.status(400).json({ error: `Source bank statement entry ID ${from_bank_statement_entry_id} not found` });
            }
            resolvedFromId = bRes.rows[0].bank_account_id;
            console.log(`[Smart Transfer] Resolved from_account_id from ${from_account_id} to ${resolvedFromId} via statement entry`);
        }

        // 🚀 SMART AUTO-RESOLUTION: Derive destination account from statement entry if provided
        if (to_bank_statement_entry_id) {
            const bRes = await client.query('SELECT bank_account_id FROM bank_statement_entries WHERE id = $1', [to_bank_statement_entry_id]);
            if (bRes.rows.length === 0) {
                return res.status(400).json({ error: `Destination bank statement entry ID ${to_bank_statement_entry_id} not found` });
            }
            resolvedToId = bRes.rows[0].bank_account_id;
            console.log(`[Smart Transfer] Resolved to_account_id from ${to_account_id} to ${resolvedToId} via statement entry`);
        }

        if (resolvedFromId === resolvedToId) {
            return res.status(400).json({ error: 'Source and Destination accounts cannot be the same' });
        }

        await client.query('BEGIN');

        // 1. Get Accounts Info
        const fromAccRes = await client.query('SELECT bank_name FROM bank_accounts WHERE id = $1', [resolvedFromId]);
        const toAccRes = await client.query('SELECT bank_name FROM bank_accounts WHERE id = $1', [resolvedToId]);

        if (fromAccRes.rows.length === 0 || toAccRes.rows.length === 0) {
            throw new Error('One or both accounts not found');
        }

        const fromAcc = fromAccRes.rows[0];
        const toAcc = toAccRes.rows[0];

        // 2. Determine COA Codes (Cash: 1003, All Banks: 1002)
        const coa_map = { 1: 1002, 2: 1003, 3: 1002, 4: 1002, 5: 1002 }; 
        const fromCOAId = coa_map[resolvedFromId] || 1003;
        const toCOAId = coa_map[resolvedToId] || 1003;

        // 3. Create Journal Entry
        // Debit To-Account, Credit From-Account
        const ledgerLines = [
            { code: toCOAId, debit: Number(amount), credit: 0, bank_account_id: resolvedToId },
            { code: fromCOAId, debit: 0, credit: Number(amount), bank_account_id: resolvedFromId }
        ];

        const description = `Internal Transfer (${payment_mode}): ${fromAcc.bank_name} -> ${toAcc.bank_name}${reference_no ? ' (Ref: ' + reference_no + ')' : ''}`;

        const journalRes = await client.query(`SELECT create_journal_entry($1, $2, $3, $4, $5)`,
            [transfer_date, description, 'TRANSFER', null, JSON.stringify(ledgerLines)]);

        const journalId = journalRes.rows[0].create_journal_entry;

        // 4. Record in internal_transfers table
        const transferRes = await client.query(`
            INSERT INTO internal_transfers (
                transfer_date, from_account_id, to_account_id, amount, 
                payment_mode, reference_no, remarks, journal_entry_id,
                from_bank_statement_entry_id, to_bank_statement_entry_id, denominations
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        `, [
            transfer_date, resolvedFromId, resolvedToId, amount,
            payment_mode, reference_no, remarks, journalId,
            from_bank_statement_entry_id, to_bank_statement_entry_id,
            denominations ? JSON.stringify(denominations) : null
        ]);

        const transferId = transferRes.rows[0].id;

        // 5. Update Bank Statement Entries (Reconciliation)
        // From side (Debit entry in bank statement = money going out)
        if (from_bank_statement_entry_id) {
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = COALESCE(consumed_amount, 0) + $1,
                    status = CASE 
                        WHEN (debit_amount - (COALESCE(consumed_amount, 0) + $1)) <= 0.01 THEN 'Exhausted'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [amount, from_bank_statement_entry_id]);
        }

        // To side (Credit entry in bank statement = money coming in)
        if (to_bank_statement_entry_id) {
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = COALESCE(consumed_amount, 0) + $1,
                    status = CASE 
                        WHEN (credit_amount - (COALESCE(consumed_amount, 0) + $1)) <= 0.01 THEN 'Exhausted'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [amount, to_bank_statement_entry_id]);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, transfer_id: transferId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Transfer Error:', err.message);
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   DELETE /api/finance/transfers/:id
// @desc    Reverse an internal transfer
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Fetch Transfer Details
        const transferRes = await client.query(`
            SELECT 
                journal_entry_id, 
                from_bank_statement_entry_id, 
                to_bank_statement_entry_id, 
                amount,
                is_active
            FROM internal_transfers 
            WHERE id = $1
        `, [id]);

        if (transferRes.rows.length === 0) throw new Error('Transfer not found');
        const transfer = transferRes.rows[0];

        if (!transfer.is_active) {
            return res.json({ success: true, message: 'Transfer already reversed' });
        }

        // 2. Reverse Bank Statement Consumption (From-side)
        if (transfer.from_bank_statement_entry_id) {
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = GREATEST(0, COALESCE(consumed_amount, 0) - $1),
                    status = CASE 
                        WHEN (amount - (GREATEST(0, COALESCE(consumed_amount, 0) - $1))) >= amount - 0.01 THEN 'Available'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [transfer.amount, transfer.from_bank_statement_entry_id]);
        }

        // 3. Reverse Bank Statement Consumption (To-side)
        if (transfer.to_bank_statement_entry_id) {
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = GREATEST(0, COALESCE(consumed_amount, 0) - $1),
                    status = CASE 
                        WHEN (amount - (GREATEST(0, COALESCE(consumed_amount, 0) - $1))) >= amount - 0.01 THEN 'Available'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [transfer.amount, transfer.to_bank_statement_entry_id]);
        }

        // 4. Nullify Reference & Deactivate
        await client.query(`
            UPDATE internal_transfers 
            SET is_active = false, journal_entry_id = NULL 
            WHERE id = $1
        `, [id]);

        // 5. Delete Journal Entry (Triggers bank balance reversal for BOTH accounts)
        if (transfer.journal_entry_id) {
            await client.query(`DELETE FROM journal_entries WHERE id = $1`, [transfer.journal_entry_id]);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Transfer and accounting effects reversed successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Delete Transfer Error:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   GET /api/finance/transfers
// @desc    Get transfer history
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                it.transfer_date,
                fa.bank_name as source_account,
                ta.bank_name as destination_account,
                it.amount as total_amount,
                it.payment_mode,
                it.reference_no,
                it.id,
                it.*
            FROM internal_transfers it
            JOIN bank_accounts fa ON it.from_account_id = fa.id
            JOIN bank_accounts ta ON it.to_account_id = ta.id
            WHERE it.is_active = true
            ORDER BY it.transfer_date DESC, it.id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
