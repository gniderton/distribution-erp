const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable'
});

async function reconcileBounces() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const pairs = [
            { cr: 178, dr: 179, msg: 'Reconciled: Bundle Bounce #567032' },
            { cr: 261, dr: 267, msg: 'Reconciled: Bundle Bounce #001171' },
            { cr: 1188, dr: 1189, msg: 'Reconciled: Bundle Bounce #171850' },
            { cr: 1215, dr: 1216, msg: 'Reconciled: Bounce #325667 (HAYYA MART)' },
            { cr: 1331, dr: 1332, msg: 'Reconciled: Bounce #680934 (Winfair)' }
        ];

        for (const p of pairs) {
            console.log(`Processing Pair: Cr ${p.cr} & Dr ${p.dr}...`);
            
            // Mark Credit as Exhausted
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = amount, 
                    status = 'Exhausted',
                    particulars = COALESCE(particulars, '') || ' ' || $1
                WHERE id = $2
            `, [p.msg, p.cr]);

            // Mark Debit as Exhausted
            await client.query(`
                UPDATE bank_statement_entries 
                SET consumed_amount = amount, 
                    status = 'Exhausted',
                    particulars = COALESCE(particulars, '') || ' ' || $1
                WHERE id = $2
            `, [p.msg, p.dr]);
        }

        await client.query('COMMIT');
        console.log('✅ Success: All 5 bounce pairs have been reconciled and Exhausted.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error during reconciliation:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

reconcileBounces();
