const { pool } = require('./config/db');
async function run() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log(res.rows.map(r => r.table_name));
    
    // Also check asset_maintenance table
    const am = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'asset_maintenance'");
    console.log("asset_maintenance columns:", am.rows.map(r => r.column_name));
    
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
