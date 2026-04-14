const { pool } = require('./config/db');

async function zeroBalances() {
    try {
        const accounts = [
            { id: 1, name: 'CASH' },
            { id: 2, name: 'AXIS' },
            { id: 3, name: 'IDFC' }
        ];

        for (const acc of accounts) {
            // 1. Calculate current sum pre-April
            const query = `
                SELECT SUM(amount_in::numeric - amount_out::numeric) as total 
                FROM view_unified_liquid_ledger 
                WHERE (direct_bank_id = $1 OR (liquid_account_id = $1 AND direct_bank_id IS NULL)) 
                AND trans_date < '2026-04-01'
            `;
            const res = await pool.query(query, [acc.id]);
            const currentTotal = parseFloat(res.rows[0].total || 0);

            if (currentTotal !== 0) {
                const offset = -currentTotal;
                console.log(`🛡️ ZEROING ${acc.name}: Current Total is ${currentTotal.toFixed(2)}. Inserting offset of ${offset.toFixed(2)}.`);
                
                const refNo = `OFF-26-${Math.floor(Date.now() / 1000)}-${acc.id}`;
                await pool.query(
                    "INSERT INTO opening_balances (account_id, amount, as_of_date, description, is_active, reference_no) VALUES ($1, $2, $3, $4, true, $5)",
                    [acc.id, offset, '2026-03-31', `Forensic Zero-Base Offset (${acc.name} Fresh Start)`, refNo]
                );
            } else {
                console.log(`✅ ${acc.name} is already at zero.`);
            }
        }
        
        console.log('\n✨ ALL LEDGERS ZEROED FOR APRIL 1ST!');

    } catch (e) {
        console.error('❌ ZEROING FAILED:', e.message);
    } finally {
        process.exit();
    }
}

zeroBalances();
