const { pool } = require('./config/db');

async function injectOpeningBalances() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const entries = [
            { code: '1002', amount: 12348.54, name: 'IDFC First Bank' },
            { code: '1001', amount: 1711.04, name: 'Axis Bank' },
            { code: '1003', amount: 29000.00, name: 'Cash in Hand' } // Added Cash as per previous target
        ];

        // Get Opening Balance Offset account
        const offsetAcc = await client.query("SELECT id FROM chart_of_accounts WHERE code = '3999'");
        const offsetId = offsetAcc.rows[0].id;

        console.log('🚀 Injecting Traceable Opening Balances...');

        for (const entry of entries) {
            // 1. Get Target Account
            const accRes = await client.query("SELECT id FROM chart_of_accounts WHERE code = $1", [entry.code]);
            if (accRes.rows.length === 0) throw new Error(`Account ${entry.code} not found`);
            const accId = accRes.rows[0].id;

            // 2. Generate Reference Number
            const seqRes = await client.query("UPDATE document_sequences SET current_number = current_number + 1 WHERE document_type = 'OPENING_BAL' RETURNING prefix, current_number");
            const refNo = `${seqRes.rows[0].prefix}${seqRes.rows[0].current_number.toString().padStart(4, '0')}`;

            // 3. Create Journal Entry
            const jeRes = await client.query(`
                INSERT INTO journal_entries (transaction_date, description, reference_type, reference_id)
                VALUES ('2026-03-31', $1, 'OPENING_BAL', null)
                RETURNING id
            `, [`Opening Balance: ${entry.name} (${refNo})`]);
            const jeId = jeRes.rows[0].id;

            // 4. Create Journal Lines
            await client.query(`
                INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
                VALUES ($1, $2, $3, 0), ($1, $4, 0, $3)
            `, [jeId, accId, entry.amount, offsetId]);

            // 5. Create Opening Balance Source Record
            const obRes = await client.query(`
                INSERT INTO opening_balances (reference_no, account_id, amount, description, journal_entry_id)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `, [refNo, accId, entry.amount, `Migration Entry for ${entry.name}`, jeId]);

            // Link JE back to source now that we have OB ID
            await client.query("UPDATE journal_entries SET reference_id = $1 WHERE id = $2", [obRes.rows[0].id.toString(), jeId]);

            console.log(`✅ ${entry.name}: Recorded as ${refNo} (JE: ${jeId})`);
        }

        await client.query('COMMIT');
        console.log('\n🌟 INTEGRITY SYNC COMPLETE: All opening balances are now traceable.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ FAILED:', err.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

injectOpeningBalances();
