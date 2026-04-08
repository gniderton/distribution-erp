const { pool } = require('../config/db');

async function fullAudit() {
  try {
    const res = await pool.query(`
      SELECT cheque_number, amount, bank_name, party_id, count(*) 
      FROM cheques 
      GROUP BY cheque_number, amount, bank_name, party_id 
      HAVING count(*) > 1
    `);
    
    if (res.rows.length > 0) {
      console.log('--- DUPLICATES FOUND (Must be cleared before adding constraint) ---');
      console.table(res.rows);
      
      // Get the IDs of these duplicates
      for (const row of res.rows) {
        const ids = await pool.query(
          'SELECT id, status, created_at FROM cheques WHERE cheque_number = $1 AND amount = $2 AND bank_name = $3 AND party_id = $4 ORDER BY id DESC',
          [row.cheque_number, row.amount, row.bank_name, row.party_id]
        );
        console.log(`\nDuplicate Group: ${row.cheque_number} (${row.amount})`);
        console.table(ids.rows);
      }
    } else {
      console.log('✅ No duplicates found. Table is clean.');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fullAudit();
