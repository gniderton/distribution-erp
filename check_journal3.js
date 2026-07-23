const { pool } = require('./config/db');

(async () => {
  try {
    const res = await pool.query(`
      SELECT id 
      FROM journal_entries 
      WHERE reference_id = 186 AND reference_type = 'GRN'
    `);
    
    if (res.rows.length === 0) {
      console.log('No journal entry found for GRN 186. That explains it.');
      // We would need to create it manually or drop the invoice and tell the user to recreate
    } else {
      console.log('Journal Entry found: ID = ' + res.rows[0].id);
      
      const lines = await pool.query(`
        SELECT id, account_id, debit, credit 
        FROM journal_lines 
        WHERE journal_entry_id = $1
      `, [res.rows[0].id]);
      console.log('Journal Lines before update:', lines.rows);
    }
  } catch(e) {
    console.error(e);
  } finally { process.exit(); }
})();
