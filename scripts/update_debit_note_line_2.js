const { pool } = require('../config/db');

async function updateDebitNoteLine() {
  try {
    const res = await pool.query("UPDATE debit_note_lines SET return_type = 'Good Stock Return' WHERE id = 2 RETURNING *");
    console.log('Record updated successfully:');
    console.log(JSON.stringify(res.rows[0], null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error updating record:', err);
    process.exit(1);
  }
}

updateDebitNoteLine();
