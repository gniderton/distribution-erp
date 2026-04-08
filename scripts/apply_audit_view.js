const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function applyAuditView() {
  try {
    const sqlPath = path.join(__dirname, '../database/173_bank_statement_narration_view.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    console.log('✅ Audit View updated successfully in the database.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to update Audit View:', err);
    process.exit(1);
  }
}

applyAuditView();
