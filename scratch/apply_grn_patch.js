const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function applyPatch() {
    const sqlPath = path.join(__dirname, '..', 'database', '202_grn_auto_knockoff_debit_notes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Extract the CREATE OR REPLACE FUNCTION block
    const startRegex = /CREATE OR REPLACE FUNCTION (public\.)?create_purchase_invoice\(/;
    const endRegex = /\$function\$/; // Assuming it ends with $function$

    // We need the WHOLE block from CREATE to the end of the function body
    // The previous view_file showed it ends at line 207 with $function$;
    
    const startIndex = sql.search(startRegex);
    const lastIndex = sql.lastIndexOf('$function$;');
    
    if (startIndex === -1 || lastIndex === -1) {
        console.error('Could not find create_purchase_invoice block in SQL file');
        process.exit(1);
    }

    const functionSql = sql.substring(startIndex, lastIndex + 11);

    console.log('Applying SQL Patch...');
    const client = await pool.connect();
    try {
        await client.query(functionSql);
        console.log('RPC Updated Successfully.');
    } catch (err) {
        console.error('Error applying RPC update:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

applyPatch();
