const { pool } = require('./config/db');
const fs = require('fs');

async function apply() {
    const client = await pool.connect();
    try {
        const sql = fs.readFileSync('./database/111_cheque_in_bank_audit_view.sql', 'utf8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('✅ view_bank_statement_details updated successfully.');

        // Verify - check the cleared cheques (status=CLEARED, bank_statement_entry_id is set)
        const r = await pool.query(`
            SELECT v.statement_entry_id, v.transaction_date, v.transaction_type, 
                   v.erp_reference, v.party_name, v.credit_amount, v.reconciliation_status
            FROM view_bank_statement_details v
            WHERE v.transaction_type IN ('Cheque Receipt', 'Cheque Payment')
            LIMIT 10
        `);
        if (r.rows.length) {
            console.log('\n✅ Cheques now visible in audit view:');
            console.table(r.rows);
        } else {
            console.log('\n⚠️  No cleared cheques found in view yet (cheques may not have bank_statement_entry_id linked).');
        }
        process.exit();
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
    }
}

apply();
