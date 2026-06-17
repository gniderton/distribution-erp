const { pool } = require('../config/db');

async function run() {
    try {
        const res = await pool.query(`
            SELECT trans_date, description, amount_in, amount_out, source_table 
            FROM view_unified_liquid_ledger 
            WHERE liquid_account_id = 1 
            ORDER BY trans_date ASC, source_id ASC
        `);
        let balance = 0;
        console.log("Date | Description | In | Out | Running Balance");
        console.log("-----------------------------------------------");
        for (const row of res.rows) {
            balance += parseFloat(row.amount_in || 0) - parseFloat(row.amount_out || 0);
            console.log(`${row.trans_date.toISOString().split('T')[0]} | ${row.description} | ${row.amount_in} | ${row.amount_out} | ${balance.toFixed(2)}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
