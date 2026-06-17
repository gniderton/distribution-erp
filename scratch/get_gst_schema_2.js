const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.vmqfldogpilxwgaukdbh:Anti%2FVirus%408463@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=disable'
});

async function getGstSchemaPart2() {
    const client = await pool.connect();
    try {
        const tables = ['customers', 'vendors', 'products'];
        console.log('--- GST Relevant Schema Part 2 ---');
        
        for (const table of tables) {
            console.log(`\nTable: ${table}`);
            const res = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);
            console.log(res.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

getGstSchemaPart2();
