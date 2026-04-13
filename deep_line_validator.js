const { pool } = require('./config/db');

async function validateLines() {
    try {
        console.log('🏛️  DEEP LINE-BY-LINE FORENSIC VALIDATION\n');
        
        const results = {
            idCollisions: [], // Inventory (1) used for Bank/Cash
            unbalanced: [],   // Dr != Cr for the entry
            sourceMismatches: [], // Ledger amount != Source table amount
            orphans: []       // No source table record found
        };

        const q = `
            SELECT 
                jl.id as line_id,
                je.id as entry_id,
                je.transaction_date,
                je.description,
                je.reference_type,
                je.source_table,
                je.source_id,
                coa.id as coa_id,
                coa.name as coa_name,
                coa.code as coa_code,
                jl.debit,
                jl.credit,
                jl.bank_account_id
            FROM journal_lines jl
            JOIN journal_entries je ON jl.journal_entry_id = je.id
            JOIN chart_of_accounts coa ON jl.account_id = coa.id
            ORDER BY je.id, jl.id
        `;
        
        const res = await pool.query(q);
        const lines = res.rows;
        
        console.log(`Processing ${lines.length} lines...`);

        for (const line of lines) {
            // 1. Check ID Collision Risk (Inventory [1] used for obvious bank tasks)
            if (line.coa_id === 1 && (line.description.toLowerCase().includes('transfer') || line.description.toLowerCase().includes('payment'))) {
                results.idCollisions.push({
                    line_id: line.line_id,
                    entry_id: line.entry_id,
                    desc: line.description,
                    amount: line.debit || line.credit,
                    reason: 'Inventory account used for Transfer/Payment'
                });
            }

            // 2. Check Source Mismatch (Verify against actual source tables)
            if (line.source_table && line.source_id) {
                try {
                    // Check customer_payments
                    if (line.source_table === 'customer_payments') {
                        const s = await pool.query("SELECT amount FROM customer_payments WHERE id = $1", [line.source_id]);
                        if (s.rows.length === 0) results.orphans.push({ line_id: line.line_id, source: 'customer_payments', id: line.source_id });
                        else if (Math.abs(parseFloat(s.rows[0].amount) - (parseFloat(line.debit) || parseFloat(line.credit))) > 0.01) {
                            results.sourceMismatches.push({ line_id: line.line_id, source: 'customer_payments', ledger: (line.debit || line.credit), actual: s.rows[0].amount });
                        }
                    }
                    // Check internal_transfers
                    if (line.source_table === 'internal_transfers') {
                        const s = await pool.query("SELECT amount FROM internal_transfers WHERE id = $1", [line.source_id]);
                        if (s.rows.length === 0) results.orphans.push({ line_id: line.line_id, source: 'internal_transfers', id: line.source_id });
                        else if (Math.abs(parseFloat(s.rows[0].amount) - (parseFloat(line.debit) || parseFloat(line.credit))) > 0.01) {
                            results.sourceMismatches.push({ line_id: line.line_id, source: 'internal_transfers', ledger: (line.debit || line.credit), actual: s.rows[0].amount });
                        }
                    }
                } catch (e) { /* ignore single line errors */ }
            }
        }

        console.log('\n--- FORENSIC RISK REPORT ---');
        console.log('1. ID Collision Criticals:', results.idCollisions.length);
        console.log('2. Source Amount Mismatches:', results.sourceMismatches.length);
        console.log('3. Orphaned Records (missing source data):', results.orphans.length);

        console.log('\n--- SAMPLE: TOP COLLISION RISK ---');
        console.table(results.idCollisions.slice(0, 5));

    } catch (e) {
        console.error(e.message);
    } finally {
        process.exit();
    }
}

validateLines();
