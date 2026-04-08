const { pool } = require('../config/db');

async function masterCleanup() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Find all duplicates based on the composite key
    const findDupesQuery = `
      SELECT cheque_number, amount, bank_name, party_id, array_agg(id ORDER BY id ASC) as ids
      FROM cheques
      GROUP BY cheque_number, amount, bank_name, party_id
      HAVING count(*) > 1
    `;
    const dupeRes = await client.query(findDupesQuery);

    if (dupeRes.rows.length === 0) {
      console.log('✅ No duplicates found.');
    } else {
      console.log(`⚠️  Found ${dupeRes.rows.length} duplicate groups. Cleaning up...`);
      
      for (const row of dupeRes.rows) {
        // Keep the first ID (original), delete the rest
        const keepId = row.ids[0];
        const deleteIds = row.ids.slice(1);
        
        await client.query('DELETE FROM cheques WHERE id = ANY($1)', [deleteIds]);
        console.log(`   Processed Chq ${row.cheque_number}: Kept ID ${keepId}, Deleted: ${deleteIds.join(', ')}`);
      }
    }

    // 2. NOW Apply the Unique Index (Directly in JS to ensure it happens in same transaction/session)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_cheque_payment 
      ON cheques (cheque_number, amount, bank_name, party_id)
    `);
    console.log('🚀 Unique Guard applied successfully!');

    await client.query('COMMIT');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Master Cleanup Failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

masterCleanup();
