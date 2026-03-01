const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// @route   GET /api/finance/loans
// @desc    List all loans with search and filters
router.get('/', async (req, res) => {
    try {
        const { party_type, status, loan_type } = req.query;
        let query = 'SELECT * FROM loans WHERE 1=1';
        let params = [];

        if (party_type) {
            params.push(party_type);
            query += ` AND party_type = $${params.length}`;
        }
        if (status) {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }
        if (loan_type) {
            params.push(loan_type);
            query += ` AND loan_type = $${params.length}`;
        }

        query += ' ORDER BY created_at DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/finance/loans
// @desc    Record a new loan disbursement
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            loan_type, // 'TAKEN' or 'GIVEN'
            party_type,
            party_id,
            party_name,
            principal_amount,
            interest_rate_pa,
            tenor_months,
            emi_amount,
            disbursement_date,
            start_date,
            payment_mode,
            bank_account_id, // Source/Target bank account
            reference_no,
            remarks,
            bank_statement_entry_id,
            user_id
        } = req.body;

        await client.query('BEGIN');

        // 1. Generate Loan Number
        const seqRes = await client.query("SELECT prefix || current_number as code, id FROM document_sequences WHERE document_type = 'LOAN' FOR UPDATE");

        if (seqRes.rows.length === 0) {
            throw new Error("Document sequence for 'LOAN' not found in document_sequences table. Please ensure migrations have been applied.");
        }

        const loanNumber = seqRes.rows[0].code;
        await client.query("UPDATE document_sequences SET current_number = current_number + 1 WHERE id = $1", [seqRes.rows[0].id]);

        // 2. Insert Loan
        const loanRes = await client.query(`
            INSERT INTO loans (
                loan_number, loan_type, party_type, party_id, party_name,
                principal_amount, interest_rate_pa, tenor_months, emi_amount,
                disbursement_date, start_date, balance_principal, balance_interest,
                status, remarks, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id
        `, [
            loanNumber, loan_type, party_type, party_id, party_name,
            principal_amount, interest_rate_pa || 0, tenor_months, emi_amount || 0,
            disbursement_date, start_date, principal_amount, 0,
            'Active', remarks, user_id
        ]);
        const loanId = loanRes.rows[0].id;

        // 3. Record Disbursement Transaction
        await client.query(`
            INSERT INTO loan_transactions (
                loan_id, transaction_date, amount, principal_portion, interest_portion,
                transaction_type, payment_mode, reference_no, bank_statement_entry_id, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            loanId, disbursement_date, principal_amount, principal_amount, 0,
            'DISBURSEMENT', payment_mode, reference_no, bank_statement_entry_id, 'Initial Disbursement'
        ]);

        // 4. Ledger Posting
        const acc_bank_cash = 1002; // Assuming 1002 handles bank/cash correctly via bank_account_id
        const acc_receivable = 1105;
        const acc_payable = 2101;

        let ledgerLines = [];
        if (loan_type === 'TAKEN') {
            // Money Borrowed: Dr Cash/Bank, Cr Loan Payable
            ledgerLines = [
                { code: acc_bank_cash, debit: principal_amount, credit: 0, bank_account_id },
                { code: acc_payable, debit: 0, credit: principal_amount }
            ];
        } else {
            // Money Lent: Dr Loan Receivable, Cr Cash/Bank
            ledgerLines = [
                { code: acc_receivable, debit: principal_amount, credit: 0 },
                { code: acc_bank_cash, debit: 0, credit: principal_amount, bank_account_id }
            ];
        }

        await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)', [
            disbursement_date,
            `Loan Disbursement (${loan_type}): ${loanNumber} - ${party_name}`,
            'LOAN_DISB',
            loanId,
            JSON.stringify(ledgerLines)
        ]);

        // 5. Consume Bank Statement Entry if provided
        if (bank_statement_entry_id) {
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = COALESCE(consumed_amount, 0) + $1,
                    status = CASE 
                        WHEN (amount - (COALESCE(consumed_amount, 0) + $1)) <= 0.01 THEN 'Exhausted'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [principal_amount, bank_statement_entry_id]);
        }

        await client.query('COMMIT');
        res.json({ success: true, loanId, loanNumber });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   POST /api/finance/loans/:id/installment
// @desc    Record a loan installment payment
router.post('/:id/installment', async (req, res) => {
    const loanId = req.params.id;
    const client = await pool.connect();
    try {
        const {
            transaction_date,
            total_amount,
            principal_portion,
            interest_portion,
            payment_mode,
            bank_account_id,
            reference_no,
            remarks,
            bank_statement_entry_id
        } = req.body;

        await client.query('BEGIN');

        // 1. Get Loan Details
        const loanRes = await client.query('SELECT * FROM loans WHERE id = $1', [loanId]);
        if (loanRes.rows.length === 0) throw new Error('Loan not found');
        const loan = loanRes.rows[0];

        // 2. Record Transaction
        await client.query(`
            INSERT INTO loan_transactions (
                loan_id, transaction_date, amount, principal_portion, interest_portion,
                transaction_type, payment_mode, reference_no, bank_statement_entry_id, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            loanId, transaction_date, total_amount, principal_portion, interest_portion,
            'INSTALLMENT', payment_mode, reference_no, bank_statement_entry_id, remarks
        ]);

        // 3. Update Balances
        await client.query(`
            UPDATE loans 
            SET balance_principal = balance_principal - $1,
                status = CASE WHEN (balance_principal - $1) <= 0 THEN 'Closed' ELSE status END
            WHERE id = $2
        `, [principal_portion, loanId]);

        // 4. Ledger Posting
        const acc_bank_cash = 1002;
        const acc_receivable = 1105;
        const acc_payable = 2101;
        const acc_int_income = 4101;
        const acc_int_expense = 5101;

        let ledgerLines = [];
        if (loan.loan_type === 'TAKEN') {
            // Repaying Borrowed Money: Dr Loans Payable (Principal), Dr Interest Expense, Cr Cash/Bank
            ledgerLines = [
                { code: acc_payable, debit: principal_portion, credit: 0 },
                { code: acc_int_expense, debit: interest_portion, credit: 0 },
                { code: acc_bank_cash, debit: 0, credit: total_amount, bank_account_id }
            ];
        } else {
            // Receiving Lent Money: Dr Cash/Bank, Cr Loans Receivable (Principal), Cr Interest Income
            ledgerLines = [
                { code: acc_bank_cash, debit: total_amount, credit: 0, bank_account_id },
                { code: acc_receivable, debit: 0, credit: principal_portion },
                { code: acc_int_income, debit: 0, credit: interest_portion }
            ];
        }

        await client.query('SELECT create_journal_entry($1, $2, $3, $4, $5)', [
            transaction_date,
            `Loan Installment: ${loan.loan_number} - ${loan.party_name}`,
            'LOAN_INST',
            loanId,
            JSON.stringify(ledgerLines)
        ]);

        // 5. Consume Bank Statement
        if (bank_statement_entry_id) {
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = COALESCE(consumed_amount, 0) + $1,
                    status = CASE 
                        WHEN (amount - (COALESCE(consumed_amount, 0) + $1)) <= 0.01 THEN 'Exhausted'
                        ELSE 'Partially Consumed'
                    END
                WHERE id = $2
            `, [total_amount, bank_statement_entry_id]);
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// @route   GET /api/finance/loans/:id/history
// @desc    Get transaction history for a loan
router.get('/:id/history', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM loan_transactions WHERE loan_id = $1 ORDER BY transaction_date DESC, created_at DESC', [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
