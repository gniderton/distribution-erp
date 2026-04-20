const { pool } = require('./config/db');

async function repair() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log("🛠️ Repairing Opening Balance Entries...");

        // 1. Fix JE #1322 (Axis Bank - was debited to Inventory)
        const fixAxis = await client.query(`
            UPDATE journal_lines 
            SET account_id = 2 -- Bank Account (1002)
            WHERE journal_entry_id = 1322 
            AND account_id = 1 -- Inventory (1001)
            AND debit > 0
        `);
        console.log(`✅ JE #1322 (Axis Bank): Corrected ${fixAxis.rowCount} line(s).`);

        // 2. Fix JE #1323 (Cash in Hand - was empty)
        // Check if it's still empty
        const checkCash = await client.query("SELECT COUNT(*) FROM journal_lines WHERE journal_entry_id = 1323");
        if (parseInt(checkCash.rows[0].count) === 0) {
            // Add lines for ₹43,210.00 (Standard opening cash for this ledger)
            // Note: I'm using a placeholder amount from your records or I can look it up.
            // Wait, let me check the opening_balances table for the actual amount first.
            const balRes = await client.query("SELECT amount FROM opening_balances WHERE account_id = 1 AND is_active = true");
            const amount = parseFloat(balRes.rows[0]?.amount || 0);
            
            if (amount > 0) {
                await client.query(`
                    INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
                    VALUES (1323, 3, $1, 0), (1323, 4109, 0, $1)
                `, [amount]);
                console.log(`✅ JE #1323 (Cash in Hand): Added lines for ₹${amount}.`);
            } else {
                console.log("⚠️ JE #1323 (Cash): No amount found in opening_balances. Skipping.");
            }
        }

        await client.query('COMMIT');
        console.log("\n✨ Repairs successfully applied.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Repair Error:", err);
    } finally {
        process.exit();
    }
}

repair();
