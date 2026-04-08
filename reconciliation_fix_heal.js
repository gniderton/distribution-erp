const { pool } = require('./config/db');

async function healReports() {
    try {
        console.log("--- Starting Global Reconciliation Healing ---");
        
        // Find all reports with 0.00 online collection that HAVE linked payments
        const refreshQuery = `
            UPDATE daily_sales_reports dsr SET
                total_collection_cash = (SELECT COALESCE(SUM(cp.amount), 0) FROM customer_payments cp WHERE cp.report_id = dsr.id AND cp.payment_mode = 'Cash'),
                total_collection_cheque = (SELECT COALESCE(SUM(cp.amount), 0) FROM customer_payments cp WHERE cp.report_id = dsr.id AND cp.payment_mode = 'Cheque'),
                total_collection_online = (SELECT COALESCE(SUM(cp.amount), 0) FROM customer_payments cp WHERE cp.report_id = dsr.id AND cp.payment_mode NOT IN ('Cash', 'Cheque')),
                total_expense = (SELECT COALESCE(SUM(de.amount), 0) FROM dse_expenses de WHERE de.report_id = dsr.id)
            WHERE dsr.report_date >= CURRENT_DATE - INTERVAL '14 days'
            AND (dsr.total_collection_cash = 0 AND dsr.total_collection_cheque = 0 AND dsr.total_collection_online = 0)
            RETURNING id, report_date, total_collection_online;
        `;
        
        const result = await pool.query(refreshQuery);
        
        if (result.rows.length === 0) {
            console.log("No stale reports found (all totals were already populated).");
        } else {
            console.log(`Successfully healed ${result.rows.length} reports:`);
            console.table(result.rows);
        }
        
    } catch (err) {
        console.error("Healing Error:", err);
    } finally {
        pool.end();
    }
}

healReports();
