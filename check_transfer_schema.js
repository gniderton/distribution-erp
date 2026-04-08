const { pool } = require('./config/db');

async function checkColumns() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'internal_transfers'
    `);
    console.log('Columns:', res.rows.map(r => r.column_name));
    
    if (!res.rows.find(r => r.column_name === 'is_active')) {
      console.log('Adding is_active column...');
       await pool.query(`ALTER TABLE internal_transfers ADD COLUMN is_active BOOLEAN DEFAULT TRUE`);
       console.log('Added!');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkColumns();
