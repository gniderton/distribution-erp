const { pool } = require('./config/db');

async function finalReconLeveling() {
    console.log("--- Starting Final Forensic Leveling & Bank Injection ---");
    
    // 1. Target Balances (User Verified)
    const targetIDFC = 12348.54;
    const targetAxis = 1711.04;
    const targetCash = 29000.00;

    // 2. Get Current Ledger Balances for these 3 accounts
    const ledgerRes = await pool.query(`
        SELECT coa.code, SUM(jl.debit - jl.credit) as current_bal
        FROM journal_lines jl
        JOIN journal_entries je ON jl.journal_entry_id = je.id
        JOIN chart_of_accounts coa ON jl.account_id = coa.id
        WHERE coa.code IN (1002, 1003)
        GROUP BY coa.code
    `);

    // Note: Account 1002 in system might represent multiple bank accounts. 
    // Usually bank_account_id is in journal_lines. Let's be more specific.
    const bankDetail = await pool.query(`
        SELECT bank_account_id, SUM(jl.debit - jl.credit) as current_bal
        FROM journal_lines jl
        WHERE account_id = (SELECT id FROM chart_of_accounts WHERE code = 1002 LIMIT 1)
        GROUP BY bank_account_id
    `);

    const cashDetail = await pool.query(`
        SELECT SUM(jl.debit - jl.credit) as current_bal
        FROM journal_lines jl
        WHERE account_id = (SELECT id FROM chart_of_accounts WHERE code = 1003 LIMIT 1)
    `);

    const currentCash = parseFloat(cashDetail.rows[0].current_bal || 0);
    const bankBals = {};
    bankDetail.rows.forEach(r => bankBals[r.bank_account_id] = parseFloat(r.current_bal || 0));

    // ID 3 = IDFC, ID 2 = Axis
    const currentIDFC = bankBals[3] || 0;
    const currentAxis = bankBals[2] || 0;

    console.log(`Current: IDFC=${currentIDFC}, Axis=${currentAxis}, Cash=${currentCash}`);

    // Calculation of Deltas
    const deltaIDFC = targetIDFC - currentIDFC;
    const deltaAxis = targetAxis - currentAxis;
    const deltaCash = targetCash - currentCash;

    console.log(`Deltas to Post: IDFC=${deltaIDFC}, Axis=${deltaAxis}, Cash=${deltaCash}`);

    const acc_bank = 1002;
    const acc_cash = 1003;
    const acc_suspense = 3999;

    const coaRes = await pool.query("SELECT id, code FROM chart_of_accounts WHERE code IN (1002, 1003, 3999)");
    const accMap = {};
    coaRes.rows.forEach(r => accMap[r.code] = r.id);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // --- Grand Leveling Entry ---
        const entry = await client.query(`
            INSERT INTO journal_entries (transaction_date, description, reference_type, reference_id)
            VALUES ('2026-04-12', 'Final Forensic Reconciliation: Bank & Cash Leveling', 'RECON', '0')
            RETURNING id
        `);
        const entryId = entry.rows[0].id;

        // Post the 3 corrections
        // 1. IDFC
        await client.query(`INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, bank_account_id) VALUES ($1, $2, $3, 0, 3)`, 
            [entryId, accMap[1002], deltaIDFC]);
        
        // 2. Axis
        await client.query(`INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, bank_account_id) VALUES ($1, $2, $3, 0, 2)`, 
            [entryId, accMap[1002], deltaAxis]);

        // 3. Cash
        if (deltaCash > 0) {
            await client.query(`INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES ($1, $2, $3, 0)`, 
                [entryId, accMap[1003], deltaCash]);
        } else {
            await client.query(`INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES ($1, $2, 0, $3)`, 
                [entryId, accMap[1003], Math.abs(deltaCash)]);
        }

        // 4. Offset (Suspense Bridge)
        const totalNetDelta = deltaIDFC + deltaAxis + deltaCash;
        if (totalNetDelta > 0) {
            await client.query(`INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES ($1, $2, 0, $3)`, 
                [entryId, accMap[3999], totalNetDelta]);
        } else {
            await client.query(`INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES ($1, $2, $3, 0)`, 
                [entryId, accMap[3999], Math.abs(totalNetDelta)]);
        }

        await client.query('COMMIT');
        console.log(`SUCCESS: Created Final Reconciliation JE ID ${entryId}`);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("FAILED final leveling:", e.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

finalReconLeveling();
