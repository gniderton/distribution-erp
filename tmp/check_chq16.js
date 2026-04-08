const { pool } = require('../config/db');
async function check() {
    // 1. Cheque details
    const chq = await pool.query("SELECT * FROM cheques WHERE id = 16");
    console.log("\n--- Cheque ---");
    console.table(chq.rows);

    // 2. Journal entries created for this bounce
    const je = await pool.query(`
        SELECT je.id, je.entry_date, je.entry_type, je.description, ji.account_code, ji.debit_amount, ji.credit_amount
        FROM journal_entries je
        JOIN journal_items ji ON ji.journal_entry_id = je.id
        WHERE je.reference_id = 16 AND je.reference_type = 'cheques'
        ORDER BY je.id, ji.id
    `);
    console.log("\n--- Journal Entries for Cheque 16 ---");
    console.table(je.rows.length ? je.rows : [{ note: 'No journal entries found for reference_id=16' }]);

    // Also try with reference_type matching patterns in the code
    const je2 = await pool.query(`
        SELECT je.id, je.entry_date, je.entry_type, je.description, ji.account_code, ji.debit_amount, ji.credit_amount
        FROM journal_entries je
        JOIN journal_items ji ON ji.journal_entry_id = je.id
        WHERE je.reference_id = 16
        ORDER BY je.id
    `);
    console.log("\n--- All Journal Entries with reference_id=16 ---");
    console.table(je2.rows.length ? je2.rows : [{ note: 'None' }]);

    process.exit();
}
check().catch(e => { console.error(e.message); process.exit(1); });
