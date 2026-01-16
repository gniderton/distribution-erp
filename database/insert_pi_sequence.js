require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('Inserting PI sequence...');
        // We use ON CONFLICT DO NOTHING to avoid errors if it already exists (race condition or previous run)
        const res = await client.query(`
      INSERT INTO document_sequences (company_settings_id, branch_id, document_type, prefix, current_number, is_active)
      VALUES (1, 1, 'PI', 'PI', 0, true)
      ON CONFLICT DO NOTHING
      RETURNING *;
    `);

        console.log('Result:', res.rows[0] || 'Already Exists');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
