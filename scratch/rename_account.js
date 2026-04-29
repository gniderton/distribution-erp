const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable'
});

async function renameAccount() {
    try {
        const res = await pool.query("UPDATE chart_of_accounts SET name = 'Common Bank Pool' WHERE id = 4454");
        console.log('Updated Rows:', res.rowCount);
    } catch (err) {
        console.error('Error updating account name:', err);
    } finally {
        await pool.end();
    }
}

renameAccount();
