const { pool } = require('../config/db');

async function cleanup() {
    try {
        console.log('Starting duplicate statement cleanup...');
        
        // Find which tables link to bank_statement_entries
        // We know: customer_payments, cheques, expenses, other_income, internal_transfers, loan_transactions, asset_transactions, employee_advances, employee_salaries
        
        const duplicateIds = [1403, 1710, 1711, 1404];
        
        for (const id of duplicateIds) {
            console.log(`\nChecking links for statement entry ID: ${id}`);
            const cp = await pool.query("SELECT id FROM customer_payments WHERE bank_statement_entry_id = $1", [id]);
            const ch = await pool.query("SELECT id FROM cheques WHERE bank_statement_entry_id = $1", [id]);
            const ex = await pool.query("SELECT id FROM expenses WHERE bank_statement_entry_id = $1", [id]);
            const oi = await pool.query("SELECT id FROM other_income WHERE bank_statement_entry_id = $1", [id]);
            
            console.log(`customer_payments: ${cp.rows.length}, cheques: ${ch.rows.length}, expenses: ${ex.rows.length}, other_income: ${oi.rows.length}`);
            
            if (cp.rows.length === 0 && ch.rows.length === 0 && ex.rows.length === 0 && oi.rows.length === 0) {
                console.log(`Deleting unlinked duplicate entry ID ${id}...`);
                await pool.query("DELETE FROM bank_statement_entries WHERE id = $1", [id]);
                console.log(`Deleted ID ${id}.`);
            } else {
                console.log(`⚠️ ID ${id} is LINKED! Skipping deletion.`);
            }
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

cleanup();
