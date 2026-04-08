const { pool } = require('./config/db');
const { parseAxisCSV } = require('./utils/bankParser');
const fs = require('fs');

async function testFinalUpload() {
    const csvPath = 'c:/Users/user/Downloads/Backened/Account_Statement_Report_04-04-2026_1158hrs.CSV';
    const content = fs.readFileSync(csvPath, 'utf8');
    const entries = parseAxisCSV(content);
    
    // Axis Bank ID is 2 based on your earlier screenshots
    const bank_account_id = 2; 
    const batchId = `TEST-BATCH-${Date.now()}`;

    console.log(`--- ATTEMPTING FINAL DB INSERT FOR ${entries.length} ENTRIES ---`);
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let inserted = 0;
        for (let entry of entries) {
            const existing = await client.query(`
                SELECT id FROM bank_statement_entries 
                WHERE bank_account_id = $7 AND (
                    (bank_ref_id = $1 AND amount = $2 AND transaction_date = $3)
                    OR (transaction_date = $3 AND particulars = $4 AND debit_amount = $5 AND credit_amount = $6)
                )
                LIMIT 1
            `, [entry.bank_ref_id || null, entry.credit_amount || 0, entry.transaction_date, entry.particulars, entry.debit_amount || 0, entry.credit_amount || 0, bank_account_id]);

            if (existing.rows.length === 0) {
                await client.query(`
                    INSERT INTO bank_statement_entries (
                        transaction_date, bank_name, particulars, bank_ref_id, 
                        debit_amount, credit_amount, amount, upload_batch_id,
                        bank_account_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    entry.transaction_date,
                    entry.bank_name,
                    entry.particulars,
                    entry.bank_ref_id || null,
                    entry.debit_amount || 0,
                    entry.credit_amount || 0,
                    entry.credit_amount || 0,
                    batchId,
                    bank_account_id
                ]);
                inserted++;
            }
        }
        await client.query('COMMIT');
        console.log(`SUCCESS: Inserted ${inserted} Axis entries into Database.`);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("DB INSERT FAILED:", e.message);
    } finally {
        client.release();
        pool.end();
    }
}

testFinalUpload();
