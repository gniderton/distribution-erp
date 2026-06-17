const { pool } = require('../config/db');

async function testLedgerView() {
    try {
        console.log('Testing proposed view logic for cheque 639246...');
        
        // Let's run a query that simulates view_unified_liquid_ledger with the new union section added.
        const query = `
            SELECT * FROM (
                -- Existing Section 2 (Cheques)
                SELECT 
                    cheque_date as trans_date,
                    party_type || ': ' || party_id as party_name,
                    'Cheque (' || status || '): ' || cheque_number as description,
                    CASE WHEN type = 'INCOMING' THEN amount ELSE 0 END as amount_in,
                    CASE WHEN type = 'OUTGOING' THEN amount ELSE 0 END as amount_out,
                    1004 as liquid_account_id,
                    bank_account_id as direct_bank_id,
                    'cheques' as source_table,
                    id as source_id,
                    bank_statement_entry_id
                FROM cheques
                WHERE status NOT ILIKE 'Cancelled' AND cheque_number = '639246'

                UNION ALL

                -- Proposed Section 13 (Bounced Cheque Reversals)
                SELECT 
                    bounce_date as trans_date,
                    party_type || ': ' || party_id as party_name,
                    'Cheque Bounce Reversal: ' || cheque_number as description,
                    CASE WHEN type = 'OUTGOING' THEN amount ELSE 0 END as amount_in,
                    CASE WHEN type = 'INCOMING' THEN amount ELSE 0 END as amount_out,
                    1004 as liquid_account_id,
                    bank_account_id as direct_bank_id,
                    'cheques_bounce' as source_table,
                    id as source_id,
                    bank_statement_entry_id
                FROM cheques
                WHERE status = 'BOUNCED' AND bounce_date IS NOT NULL AND cheque_number = '639246'
            ) sub
            ORDER BY trans_date ASC, source_table ASC
        `;
        
        const res = await pool.query(query);
        console.log('Simulation Results for Cheque 639246:', JSON.stringify(res.rows, null, 2));
        
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

testLedgerView();
