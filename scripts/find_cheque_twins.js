const { pool } = require('../config/db');

async function findTwins() {
  try {
    const chqNums = ['680981', '001223', '591503'];
    const res = await pool.query('SELECT id, cheque_number, amount, status, reference_type, reference_id, created_at, bank_statement_entry_id FROM cheques WHERE cheque_number = ANY($1)', [chqNums]);
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findTwins();
