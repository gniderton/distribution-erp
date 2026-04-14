const { pool } = require('./config/db');

async function audit() {
    try {
        console.log('🕵️ AUDITING GENERIC BANK (1002) AND TARGET ENTRIES...');

        // 1. Audit the 4 specifically mentioned entries
        const targetRes = await pool.query(`
            SELECT jl.journal_entry_id, jl.account_id, coa.name, jl.debit, jl.credit 
            FROM journal_lines jl 
            JOIN chart_of_accounts coa ON jl.account_id = coa.id 
            WHERE jl.journal_entry_id IN (411, 729, 890, 1008)
            ORDER BY jl.journal_entry_id, jl.debit DESC
        `);
        console.log('\n--- 🛑 TARGET ENTRIES (411, 729, 890, 1008) ---');
        console.table(targetRes.rows);

        // 2. Audit all lines in account 1002 (Generic Bank)
        // We'll pull the start of them to see patterns
        const genericRes = await pool.query(`
            SELECT jl.id as line_id, jl.journal_entry_id, je.description, jl.debit, jl.credit
            FROM journal_lines jl
            JOIN journal_entries je ON jl.journal_entry_id = je.id
            WHERE jl.account_id = (SELECT id FROM chart_of_accounts WHERE name = 'Bank Account' LIMIT 1)
            ORDER BY je.transaction_date DESC
            LIMIT 50
        `);
        console.log('\n--- 🏦 GENERIC BANK (1002) - RECENT LINES ---');
        console.table(genericRes.rows);

        // 3. Count total lines in 1002
        const countRes = await pool.query(`
            SELECT COUNT(*) 
            FROM journal_lines 
            WHERE account_id = (SELECT id FROM chart_of_accounts WHERE name = 'Bank Account' LIMIT 1)
        `);
        console.log(`\nTotal lines in Generic Bank Account: ${countRes.rows[0].count}`);

    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

audit();
