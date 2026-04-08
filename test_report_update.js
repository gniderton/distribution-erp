const { pool } = require('./config/db');

async function testUpdate() {
    const reportId = 26;
    try {
        console.log(`--- Refreshing Summary for Report ${reportId} ---`);
        
        const updateQuery = `
            UPDATE daily_sales_reports SET
                total_collection_cash = (SELECT COALESCE(SUM(amount), 0) FROM customer_payments WHERE report_id = $1 AND payment_mode = 'Cash'),
                total_collection_cheque = (SELECT COALESCE(SUM(amount), 0) FROM customer_payments WHERE report_id = $1 AND payment_mode = 'Cheque'),
                total_collection_online = (SELECT COALESCE(SUM(amount), 0) FROM customer_payments WHERE report_id = $1 AND payment_mode NOT IN ('Cash', 'Cheque'))
            WHERE id = $1
            RETURNING total_collection_cash, total_collection_cheque, total_collection_online;
        `;
        
        const result = await pool.query(updateQuery, [reportId]);
        console.log("Updated Values:");
        console.table(result.rows);
        
    } catch (err) {
        console.error("Update Error:", err);
    } finally {
        pool.end();
    }
}

testUpdate();
