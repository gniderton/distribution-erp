const { pool } = require('./config/db');
async function run() {
    try {
        // 1. Check for Axis
        let axis = await pool.query("SELECT id FROM chart_of_accounts WHERE name ILIKE '%Axis Bank (9157)%'");
        if (axis.rows.length === 0) {
            axis = await pool.query("INSERT INTO chart_of_accounts (name, code, type) VALUES ('Axis Bank (9157)', '1004', 'Asset') RETURNING id");
        }
        
        // 2. Check for IDFC
        let idfc = await pool.query("SELECT id FROM chart_of_accounts WHERE name ILIKE '%IDFC First Bank (0706)%'");
        if (idfc.rows.length === 0) {
            idfc = await pool.query("INSERT INTO chart_of_accounts (name, code, type) VALUES ('IDFC First Bank (0706)', '1005', 'Asset') RETURNING id");
        }

        console.log(`IDs|AXIS:${axis.rows[0].id}|IDFC:${idfc.rows[0].id}`);
    } catch(e) {
        console.error(e.message);
    } finally {
        process.exit();
    }
}
run();
