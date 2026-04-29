const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable'
});

async function update() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('1. Updating employee_advances (id: 1)...');
        const resAdv = await client.query(`
            UPDATE employee_advances 
            SET bank_statement_entry_id = 1280, 
                payment_mode = 'Online'
            WHERE id = 1
            RETURNING journal_entry_id
        `);
        
        if (resAdv.rows.length === 0) {
            throw new Error('Employee advance id: 1 not found');
        }
        
        const journalEntryId = resAdv.rows[0].journal_entry_id;

        console.log('2. Updating bank_statement_entries (id: 1280)...');
        await client.query(`
            UPDATE bank_statement_entries 
            SET consumed_amount = 2500.00, 
                status = 'Exhausted'
            WHERE id = 1280
        `);

        if (journalEntryId) {
            console.log('3. Updating journal_lines for journal_entry_id ' + journalEntryId + '...');
            // Account 3 is 'Cash in Hand' (COA code 1003)
            // Account 4454 is 'IDFC First Bank (0706)' (COA code 1103)
            // Bank Account 3 is 'IDFC First Bank (Calicut)'
            
            const resJL = await client.query(`
                UPDATE journal_lines 
                SET account_id = 4454,
                    bank_account_id = 3
                WHERE journal_entry_id = $1 AND account_id = 3 AND credit > 0
                RETURNING id
            `, [journalEntryId]);
            
            if (resJL.rows.length === 0) {
                console.warn('Warning: No journal line found with account_id 3 and credit > 0 for this journal entry.');
            } else {
                console.log('Updated journal line id: ' + resJL.rows[0].id);
            }
        }

        await client.query('COMMIT');
        console.log('✅ Update successful!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error during update:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

update();
