const { pool } = require('../config/db');

async function finalCleanup() {
  try {
    const ids = [20, 15];
    const res = await pool.query('DELETE FROM cheques WHERE id = ANY($1) RETURNING id', [ids]);
    console.log('Successfully deleted final redundant cheque IDs:', res.rows.map(r => r.id).join(', '));
    process.exit(0);
  } catch (err) {
    console.error('❌ Final cleanup failed:', err);
    process.exit(1);
  }
}

finalCleanup();
