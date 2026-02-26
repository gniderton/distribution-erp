const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable',
    ssl: { rejectUnauthorized: false }
});

async function runTests() {
    try {
        console.log('--- Testing /trips with Verified filter ---');
        const tripsRes = await pool.query(`
            SELECT 
                dt.id, dt.trip_number, dt.status
            FROM delivery_trips dt
            WHERE dt.status = ANY($1)
            LIMIT 5
        `, [['Verified']]);
        console.log('Verified Trips:', tripsRes.rows.length);

        console.log('\n--- Testing /sync-logs with counts ---');
        const syncLogsRes = await pool.query(`
            SELECT 
                sl.id, sl.trip_id,
                (SELECT COUNT(*) FROM trip_invoices WHERE sync_id = sl.id) as manifest_count,
                (SELECT COUNT(*) FROM trip_returns WHERE sync_id = sl.id) as return_count
            FROM sync_logs sl
            ORDER BY sl.created_at DESC
            LIMIT 5
        `);
        console.log('Sync Logs with counts:', JSON.stringify(syncLogsRes.rows, null, 2));

        console.log('\n--- Testing /sync/:id/details (picking first sync) ---');
        if (syncLogsRes.rows.length > 0) {
            const syncId = syncLogsRes.rows[0].id;
            const manifest = await pool.query('SELECT COUNT(*) FROM trip_invoices WHERE sync_id = $1', [syncId]);
            const returns = await pool.query('SELECT COUNT(*) FROM trip_returns WHERE sync_id = $1', [syncId]);
            console.log(`Sync ID ${syncId} Details -> Manifest: ${manifest.rows[0].count}, Returns: ${returns.rows[0].count}`);
        }

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        await pool.end();
    }
}

runTests();
