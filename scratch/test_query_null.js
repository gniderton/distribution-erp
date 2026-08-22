const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/distribution_erp' });

async function run() {
  try {
    const res = await pool.query(`
      SELECT 
        GREATEST(0, 100 - NULL) as res1,
        GREATEST(0, COALESCE(NULL, 0) - 100) as res2,
        CASE WHEN (COALESCE(NULL, 0) - 100) <= 0.01 THEN 'Available' ELSE 'Partially Consumed' END as res3
    `);
    console.log(res.rows[0]);
  } catch (e) {
    console.error(e.message);
  } finally {
    pool.end();
  }
}
run();
