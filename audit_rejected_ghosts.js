const { pool } = require('./config/db');

async function auditRejectedGhosts() {
    try {
        console.log("🕵️ Searching for Ghost Journals created by Rejected Payments...");

        // 1. Find Rejected Payments that have a PAY_REJECT journal
        const result = await pool.query(`
            SELECT 
                cp.id as payment_id,
                cp.payment_number,
                cp.amount,
                cp.verification_status,
                j.id as journal_id,
                j.description,
                j.reference_type
            FROM customer_payments cp
            JOIN journal_entries j ON cp.id = j.reference_id AND j.reference_type IN ('PAY_REJECT', 'CUST_PAY')
            WHERE cp.verification_status = 'Rejected'
        `);

        if (result.rows.length === 0) {
            console.log("✅ No Ghost Journals found for Rejected payments. The system is clean.");
        } else {
            console.log(`❌ Found ${result.rows.length} Ghost Journals linked to Rejected payments:`);
            console.table(result.rows);
            console.log("\n⚠️ These entries are incorrectly affecting your bank balance and AR.");
        }

    } catch (err) {
        console.error("Audit Error:", err);
    } finally {
        process.exit();
    }
}

auditRejectedGhosts();
