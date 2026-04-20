const { pool } = require('./config/db');

async function auditOpeningBalance() {
    try {
        console.log("🕵️ Auditing Opening Balance Journal Entries...\n");

        // 1. Check Chart of Accounts for Opening Equity
        const coaRes = await pool.query(`
            SELECT id, code, name 
            FROM chart_of_accounts 
            WHERE name ILIKE '%Opening%' OR name ILIKE '%Equity%' OR name ILIKE '%Capital%'
            ORDER BY code
        `);
        console.log("--- Relevant Chart of Accounts ---");
        console.table(coaRes.rows);

        // 2. Search for Manual Journal Entries related to Opening Balance
        const jeRes = await pool.query(`
            SELECT id, transaction_date, description, reference_type 
            FROM journal_entries 
            WHERE description ILIKE '%Opening%' 
               OR description ILIKE '%Inventory%' 
               OR description ILIKE '%Equity%'
            ORDER BY transaction_date ASC
        `);
        console.log("\n--- Potential Opening Journal Entries ---");
        console.table(jeRes.rows);

        for (const je of jeRes.rows) {
            const linesRes = await pool.query(`
                SELECT jl.account_id, coa.code, coa.name, jl.debit, jl.credit 
                FROM journal_lines jl 
                JOIN chart_of_accounts coa ON jl.account_id = coa.id 
                WHERE jl.journal_entry_id = $1
            `, [je.id]);
            console.log(`\nLines for JE #${je.id} (${je.description}):`);
            console.table(linesRes.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

auditOpeningBalance();
