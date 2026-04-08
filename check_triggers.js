const { pool } = require('./config/db');

async function checkTriggers() {
    try {
        console.log('--- Triggers on sales_invoice_lines ---');
        const res = await pool.query(`
            SELECT event_object_table, trigger_name, event_manipulation, 
                   action_statement, action_timing
            FROM information_schema.triggers
            WHERE event_object_table = 'sales_invoice_lines'
        `);
        console.table(res.rows);

        console.log('\n--- Functions used in triggers ---');
        // This is a bit more complex, let's just see if any exist first
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkTriggers();
