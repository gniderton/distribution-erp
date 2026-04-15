const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function run() {
    const sql = fs.readFileSync(path.join(__dirname, '195_fix_grn_function_ambiguity.sql'), 'utf8');
    console.log('Applying migration 195: Fix GRN function ambiguity...');
    try {
        await pool.query(sql);
        console.log('SUCCESS: Migration applied. Function ambiguity resolved.');
        
        // Verify only 1 function exists now
        const check = await pool.query(`
            SELECT proname, pg_get_function_identity_arguments(oid) as args
            FROM pg_proc 
            WHERE proname = 'create_purchase_invoice'
        `);
        console.log('Functions remaining:', check.rows.length);
        check.rows.forEach(r => console.log(' -', r.proname, '(', r.args, ')'));
    } catch(err) {
        console.error('ERROR:', err.message);
    } finally {
        await pool.end();
    }
}
run();
