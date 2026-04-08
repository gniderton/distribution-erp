const { pool } = require('./config/db');

const KEEP_LIST = [
    'accounts',
    'account_groups',
    'document_sequence',
    'routes',
    'channels',
    'bank_accounts',
    'hsn',
    'tax',
    'uom'
];

async function executePurge() {
    try {
        // 1. Get all tables
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `);
        
        const allTables = res.rows.map(r => r.table_name);
        const clearTables = allTables.filter(t => !KEEP_LIST.includes(t));

        console.log("--- TABLES TO BE PURGED (TRUNCATED) ---");
        console.log(clearTables.join(', '));
        console.log("\n--- TABLES TO BE PRESERVED ---");
        console.log(KEEP_LIST.join(', '));

        // 2. Perform Counts before
        console.log("\n--- COUNTS BEFORE ---");
        const keyTables = ['sales_invoices', 'employees', 'customers', 'accounts'];
        for (const t of keyTables) {
            if (allTables.includes(t)) {
                const countRes = await pool.query(`SELECT count(*) FROM ${t}`);
                console.log(`${t}: ${countRes.rows[0].count}`);
            }
        }

        // 3. EXECUTE TRUNCATE
        console.log("\nExecuting TRUNCATE...");
        // Split into chunks to avoid too long command
        const truncateSql = `TRUNCATE TABLE ${clearTables.join(', ')} RESTART IDENTITY CASCADE;`;
        await pool.query(truncateSql);
        console.log("TRUNCATE SUCCESSFUL!");

        // 4. Perform Counts after
        console.log("\n--- COUNTS AFTER ---");
        for (const t of keyTables) {
            if (allTables.includes(t)) {
                const countRes = await pool.query(`SELECT count(*) FROM ${t}`);
                console.log(`${t}: ${countRes.rows[0].count}`);
            }
        }

    } catch (err) {
        console.error("!!!! ERROR DURING PURGE !!!!");
        console.error(err);
    } finally {
        await pool.end();
    }
}

executePurge();
