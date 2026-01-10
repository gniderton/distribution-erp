const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function apply() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '019_fix_security_lints.sql'), 'utf8');
        console.log('Applying Security Fixes...');
        await pool.query(sql);
        console.log('Security Fixes Applied Successfully (RLS Enable + View Invoker).');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
apply();
