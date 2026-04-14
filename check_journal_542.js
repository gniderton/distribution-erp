const { pool } = require('./config/db');

async function checkJournalLines() {
    try {
        console.log('🕵️ ANALYZING JOURNAL LINES FOR ENTRY 542...');
        const res = await pool.query(`
            SELECT jl.id, jl.account_id, jl.bank_account_id, jl.debit, jl.credit 
            FROM journal_lines jl 
            WHERE jl.journal_entry_id = 542
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkJournalLines();
