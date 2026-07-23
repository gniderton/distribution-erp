const { pool } = require('./config/db');

(async () => {
  try {
    const res = await pool.query(`
      SELECT id, reference_id, reference_type, total_amount, description
      FROM general_ledger 
      WHERE reference_id = 186 AND reference_type = 'GRN'
    `);
    console.log('General Ledger Entries:', res.rows);
  } catch(e) {
    try {
      const res2 = await pool.query(`
        SELECT id, reference_id, reference_type, total_amount, description
        FROM journal_headers 
        WHERE reference_id = 186 AND reference_type = 'GRN'
      `);
      console.log('Journal Headers:', res2.rows);
    } catch(err2) {
      console.error(err2);
    }
  } finally { process.exit(); }
})();
