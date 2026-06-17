const { pool } = require('../config/db');

async function checkCheque() {
    try {
        console.log('Searching for cheque 639246...');
        const chqRes = await pool.query("SELECT * FROM cheques WHERE cheque_number = '639246'");
        console.log('Cheque Records:', JSON.stringify(chqRes.rows, null, 2));

        if (chqRes.rows.length > 0) {
            const chqId = chqRes.rows[0].id;
            
            // Look up journal entries referencing this cheque id
            const jeRes = await pool.query("SELECT * FROM journal_entries WHERE reference_id = $1 OR description ILIKE '%639246%'", [String(chqId)]);
            console.log('Journal Entries:', JSON.stringify(jeRes.rows, null, 2));

            for (const je of jeRes.rows) {
                const jlRes = await pool.query("SELECT jl.*, coa.name as account_name FROM journal_lines jl JOIN chart_of_accounts coa ON jl.account_id = coa.id WHERE jl.journal_entry_id = $1", [je.id]);
                console.log(`Journal Lines for JE ${je.id} (${je.reference_type}):`, JSON.stringify(jlRes.rows, null, 2));
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkCheque();
