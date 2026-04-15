const { pool } = require('./config/db');

async function checkTriggers() {
    try {
        // 1. Check live function body for 'invoice_date'
        const fnRes = await pool.query(`
            SELECT pg_get_functiondef(p.oid) as def
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = 'create_purchase_invoice'
        `);
        
        const body = fnRes.rows[0]?.def || '';
        console.log("=== LIVE FUNCTION BODY (contains 'invoice_date'?) ===");
        console.log(body.includes('invoice_date') ? "❌ YES - old column still referenced!" : "✅ NO - clean");

        // 2. Check triggers on purchase_invoice_headers
        const trgRes = await pool.query(`
            SELECT trigger_name, event_manipulation, action_statement
            FROM information_schema.triggers
            WHERE event_object_table = 'purchase_invoice_headers'
        `);
        console.log("\n=== TRIGGERS ON purchase_invoice_headers ===");
        if (trgRes.rows.length === 0) {
            console.log("No triggers found.");
        } else {
            console.table(trgRes.rows);
        }

    } catch (err) {
        console.error("Check Error:", err.message);
    } finally {
        process.exit();
    }
}

checkTriggers();
