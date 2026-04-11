
const { pool } = require('./config/db');

async function repair() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Link Payment to Statement
        await client.query('UPDATE customer_payments SET bank_statement_entry_id = 213 WHERE id = 596');
        
        // 2. Mark Statement as Exhausted
        await client.query("UPDATE bank_statement_entries SET status = 'Exhausted', consumed_amount = 944.00 WHERE id = 213");
        
        await client.query('COMMIT');
        console.log('✅ Successfully linked Payment 596 and Bank Statement 213');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to repair:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

repair();
