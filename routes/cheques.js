const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// 1. List All Cheques (Management Dashboard)
router.get('/', async (req, res) => {
    try {
        const { status, type, party_type, start_date, end_date } = req.query;
        let query = `
            SELECT ch.*, 
                CASE 
                    WHEN party_type = 'CUSTOMER' THEN (SELECT customer_name FROM customers WHERE id = party_id)
                    WHEN party_type = 'VENDOR' THEN (SELECT vendor_name FROM vendors WHERE id = party_id)
                    ELSE party_type
                END as party_name
            FROM cheques ch
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }
        if (type) {
            params.push(type);
            query += ` AND type = $${params.length}`;
        }
        if (party_type) {
            params.push(party_type);
            query += ` AND party_type = $${params.length}`;
        }
        if (start_date) {
            params.push(start_date);
            query += ` AND cheque_date >= $${params.length}`;
        }
        if (end_date) {
            params.push(end_date);
            query += ` AND cheque_date <= $${params.length}`;
        }

        query += ` ORDER BY cheque_date ASC, created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Mark Cheque as Cleared
router.post('/:id/clear', async (req, res) => {
    const { id } = req.params;
    const { clearance_date, bank_account_id, user_id, remarks } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get Cheque Info
        const chqRes = await client.query('SELECT * FROM cheques WHERE id = $1 AND status = \'PENDING\'', [id]);
        if (chqRes.rows.length === 0) throw new Error('Cheque not found or already processed');
        const chq = chqRes.rows[0];

        if (!bank_account_id) throw new Error('Bank Account is required for clearing');

        // 2. Update status
        await client.query(`
            UPDATE cheques 
            SET status = 'CLEARED', 
                clearance_date = $1, 
                bank_account_id = $2, 
                remarks = $3,
                updated_at = NOW()
            WHERE id = $4
        `, [clearance_date || new Date(), bank_account_id, remarks, id]);

        // 3. Post Accounting Entry
        // Clearing Account -> Bank Account
        const acc_bank = 1002;
        const acc_cheque_in_hand = 1004;
        const acc_cheque_issued = 2004;

        let ledgerLines = [];
        if (chq.type === 'INCOMING') {
            // Received Cheque Cleared: Dr Bank (Asset increases), Cr Cheques in Hand (Asset decreases)
            ledgerLines = [
                { code: acc_bank, debit: Number(chq.amount), credit: 0, bank_account_id: bank_account_id },
                { code: acc_cheque_in_hand, debit: 0, credit: Number(chq.amount) }
            ];
        } else {
            // Issued Cheque Cleared: Dr Cheques Issued (Liability decreases), Cr Bank (Asset decreases)
            ledgerLines = [
                { code: acc_cheque_issued, debit: Number(chq.amount), credit: 0 },
                { code: acc_bank, debit: 0, credit: Number(chq.amount), bank_account_id: bank_account_id }
            ];
        }

        await client.query('SELECT create_journal_entry($1, $2, \'CHQ_CLEAR\', $3, $4)', [
            clearance_date || new Date(),
            `Cheque Cleared: ${chq.cheque_number} (${chq.bank_name})`,
            id,
            JSON.stringify(ledgerLines)
        ]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Cheque marked as Cleared' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// 3. Mark Cheque as Bounced
router.post('/:id/bounce', async (req, res) => {
    const { id } = req.params;
    const { bounce_date, bounce_charges, remarks, user_id } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get Cheque Info
        const chqRes = await client.query('SELECT * FROM cheques WHERE id = $1 AND status = \'PENDING\'', [id]);
        if (chqRes.rows.length === 0) throw new Error('Cheque not found or already processed');
        const chq = chqRes.rows[0];

        // 2. Update status
        await client.query(`
            UPDATE cheques 
            SET status = 'BOUNCED', 
                remarks = $1,
                updated_at = NOW()
            WHERE id = $2
        `, [remarks, id]);

        // 3. Post Accounting Entry (Reversal)
        const acc_ar = 1101;
        const acc_ap = 2001;
        const acc_cheque_in_hand = 1004;
        const acc_cheque_issued = 2004;
        const acc_bank_charges = 5005; // Assuming 5005 is Bank Charges

        let ledgerLines = [];
        if (chq.type === 'INCOMING') {
            // Incoming Bounce: Dr AR (Party owes us again), Cr Cheques in Hand (Asset cleared)
            ledgerLines = [
                { code: acc_ar, debit: Number(chq.amount), credit: 0 },
                { code: acc_cheque_in_hand, debit: 0, credit: Number(chq.amount) }
            ];

            // Add bounce charges to the Party if specified
            if (Number(bounce_charges) > 0) {
                ledgerLines.push({ code: acc_ar, debit: Number(bounce_charges), credit: 0 });
                ledgerLines.push({ code: acc_bank_charges, debit: 0, credit: Number(bounce_charges) });
            }
        } else {
            // Outgoing Bounce: Dr Cheques Issued (Clearing account), Cr AP (We owe them again)
            ledgerLines = [
                { code: acc_cheque_issued, debit: Number(chq.amount), credit: 0 },
                { code: acc_ap, debit: 0, credit: Number(chq.amount) }
            ];

            // Charges paid for own cheque bounce
            if (Number(bounce_charges) > 0) {
                ledgerLines.push({ code: acc_bank_charges, debit: Number(bounce_charges), credit: 0 });
                // Note: Need a bank account here, but since it's a bounce we might skip bank line or credit AP
                ledgerLines.push({ code: acc_ap, debit: 0, credit: Number(bounce_charges) });
            }
        }

        await client.query('SELECT create_journal_entry($1, $2, \'CHQ_BOUNCE\', $3, $4)', [
            bounce_date || new Date(),
            `Cheque Bounced: ${chq.cheque_number} (${chq.bank_name})`,
            id,
            JSON.stringify(ledgerLines)
        ]);

        await client.query('COMMIT');
        res.json({ success: true, message: 'Cheque marked as Bounced' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
