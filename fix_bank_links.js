const { pool } = require('./config/db');

async function run() {
    try {
        const client = await pool.connect();
        
        const payRes = await client.query(`
            SELECT p.id, p.amount, p.transaction_ref, p.bank_statement_entry_id
            FROM customer_payments p
            WHERE p.verification_status = 'Verified'
            AND p.transaction_ref LIKE '[%]%'
            AND p.bank_statement_entry_id IS NULL
        `);
        console.log(`Found ${payRes.rows.length} unlinked payments with [ID] pattern.`);
        
        await client.query('BEGIN');

        for (const pay of payRes.rows) {
            const match = pay.transaction_ref.match(/^\[(\d+)\]/);
            if (match) {
                const bankEntryId = parseInt(match[1]);
                console.log(`Fixing Payment ${pay.id}: Linking to Bank Entry ${bankEntryId}`);
                
                // Get bank entry
                const bRes = await client.query('SELECT amount, consumed_amount, bank_account_id FROM bank_statement_entries WHERE id = $1', [bankEntryId]);
                if (bRes.rows.length > 0) {
                    const bEntry = bRes.rows[0];
                    const newConsumed = Number(bEntry.consumed_amount) + Number(pay.amount);
                    const newStatus = (newConsumed >= Number(bEntry.amount) - 1) ? 'Exhausted' : 'Partially Consumed';
                    
                    // Update bank statement entry
                    await client.query(`
                        UPDATE bank_statement_entries 
                        SET consumed_amount = $1, status = $2 
                        WHERE id = $3
                    `, [newConsumed, newStatus, bankEntryId]);

                    // Update payment
                    await client.query(`
                        UPDATE customer_payments 
                        SET bank_statement_entry_id = $1, bank_id = $2
                        WHERE id = $3
                    `, [bankEntryId, bEntry.bank_account_id, pay.id]);
                } else {
                    console.log(`Bank entry ${bankEntryId} not found!`);
                }
            }
        }

        await client.query('COMMIT');
        console.log("Fix completed.");
        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
