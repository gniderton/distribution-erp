const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
    const client = await pool.connect();
    try {
        const sql = fs.readFileSync(path.join(__dirname, '../database/110_cheque_bounce_ledger_views.sql'), 'utf8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('✅ Ledger views updated successfully.');

        // Verification: Check if bounced cheque appears for customer
        const res = await pool.query("SELECT customer_id, date, type, reference_number, description, debit_amount FROM view_customer_ledger WHERE type = 'CHEQUE_BOUNCE' LIMIT 5");
        if (res.rows.length > 0) {
            console.log('\n✅ Bounced cheques found in customer ledger:');
            console.table(res.rows);
        } else {
            console.log('\n⚠️  No CHEQUE_BOUNCE entries found in view_customer_ledger yet.');
        }
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
