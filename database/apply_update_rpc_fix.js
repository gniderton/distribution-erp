const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function applyRpcFix() {
    try {
        console.log('--- Applying Update PO RPC Fix ---');

        const sqlPath = path.join(__dirname, '007_rpc_update_po.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);

        console.log('✅ RPC Function updated successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error applying RPC:', err);
        process.exit(1);
    }
}

applyRpcFix();
