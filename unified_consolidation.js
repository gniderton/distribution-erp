const { pool } = require('./config/db');

async function unify() {
    try {
        console.log('🏗️  Starting Unified Consolidation to Account 1002...');
        await pool.query('BEGIN');

        // 1. Get the real ID for COA Code 1002 (Bank Account)
        const coaRes = await pool.query("SELECT id FROM chart_of_accounts WHERE code = '1002' LIMIT 1");
        if (coaRes.rows.length === 0) throw new Error('COA 1002 not found');
        const bankCOAId = coaRes.rows[0].id;

        // 2. Move Axis (4453) lines back to 1002 and stamp bank_account_id = 2
        const axisMove = await pool.query(`
            UPDATE journal_lines 
            SET account_id = $1,
                bank_account_id = 2
            WHERE account_id = 4453
        `, [bankCOAId]);
        console.log(`✅ Consolidated Axis Lines: ${axisMove.rowCount}`);

        // 3. Move IDFC (4454) lines back to 1002 and stamp bank_account_id = 3
        const idfcMove = await pool.query(`
            UPDATE journal_lines 
            SET account_id = $1,
                bank_account_id = 3
            WHERE account_id = 4454
        `, [bankCOAId]);
        console.log(`✅ Consolidated IDFC Lines: ${idfcMove.rowCount}`);

        // 4. Repair the 4 specific split entries (411, 729, 890, 1008)
        // Ensure both sides of these transfers hit account 1002
        // (The credit side might already be in 1103/4454, so the move above handled it)
        // (The debit side is in 1002, but might have bank_account_id as NULL or 1)
        
        await pool.query(`
            UPDATE journal_lines 
            SET bank_account_id = 3 
            WHERE journal_entry_id IN (411, 729, 890, 1008) AND account_id = $1 AND debit > 0
        `, [bankCOAId]);
        console.log('✅ Repaired split entries 411, 729, 890, and 1008.');

        await pool.query('COMMIT');
        console.log('🏁 CONSOLIDATION COMPLETE.');
    } catch(e) {
        await pool.query('ROLLBACK');
        console.error('❌ Consolidation Failed:', e.message);
    } finally {
        process.exit();
    }
}

unify();
