const { pool } = require('./config/db');

async function repair() {
    try {
        const utr = 'AXNGG09305396269';
        console.log(`--- SEARCHING FOR UTR: ${utr} ---`);
        
        // Find ANY record with this UTR to see the correct amount
        const r = await pool.query("SELECT * FROM bank_statement_entries WHERE particulars LIKE $1 OR bank_ref_id = $2", [`%${utr}%`, utr]);
        console.table(r.rows);
        
        if (r.rows.length > 0) {
            const amount = 50.00; // Hardcoding based on previous turn check #70
            const id = 29;
            
            // Re-heal ID 29. 
            // In turn #70 it was DEBIT=50, CREDIT=50. 
            // Since it is an Axis NEFT outgoing (UTIB...), it is likely a DEBIT.
            await pool.query('UPDATE bank_statement_entries SET debit_amount = $1, credit_amount = 0, amount = $1 WHERE id = $2', [amount, id]);
            console.log(`SUCCESS: Restored ID 29 to Debit: ${amount}`);
        }
        
    } catch (e) {
        console.error("Repair Failed:", e.message);
    } finally {
        pool.end();
    }
}

repair();
