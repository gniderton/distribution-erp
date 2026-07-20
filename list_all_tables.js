const { pool } = require('./config/db');

async function test() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('--- ALL TABLES IN DB ---');
    console.log(res.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.log('Error:', err.message);
  }
  process.exit(0);
}

test();
