const { pool } = require('../config/db');

async function finalCleanup() {
  try {
    const idsToDelete = [13, 16, 19];
    const res = await pool.query('DELETE FROM cheques WHERE id = ANY($1) RETURNING id', [idsToDelete]);
    console.log('Successfully deleted cheque IDs:', res.rows.map(r => r.id).join(', '));
    
    // Also check for any other duplicates we found earlier
    // (681032/4298.0, 002351/2098.0, etc.)
    // For now, I'll only touch the IDs the user explicitly mentioned to avoid accidental data loss.
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
  }
}

finalCleanup();
