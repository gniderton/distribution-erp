const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkColumns() {
  const tables = ['customer_payment_allocations', 'payment_allocations'];
  for (const table of tables) {
    console.log(`\nColumns for ${table}:`);
    try {
      const res = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      console.log(res.rows.map(r => r.column_name).join(', '));
    } catch (e) {
      console.log(`Error checking ${table}: ${e.message}`);
    }
  }
  await pool.end();
}

checkColumns();
