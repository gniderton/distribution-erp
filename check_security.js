const { pool } = require('./config/db');

async function checkSecurity() {
    try {
        console.log("--- VIEWS AUDIT ---");
        // Get all views and their invoker status (Postgres 15+)
        const viewsRes = await pool.query(`
            SELECT 
                schemaname, 
                viewname, 
                viewowner,
                definition
            FROM pg_views
            WHERE schemaname = 'public'
        `);
        
        for (const view of viewsRes.rows) {
             const optionsRes = await pool.query(`
                SELECT reloptions 
                FROM pg_class c 
                JOIN pg_namespace n ON n.oid = c.relnamespace 
                WHERE n.nspname = $1 AND c.relname = $2
             `, [view.schemaname, view.viewname]);
             
             const options = optionsRes.rows[0]?.reloptions || [];
             const isInvoker = options.includes('security_invoker=true');
             
             if (!isInvoker) {
                 console.log(`[View] ${view.schemaname}.${view.viewname} (Owner: ${view.viewowner}) - SECURITY DEFINER (Implicitly or Explicitly)`);
             }
        }

        console.log("\n--- TABLES RLS AUDIT ---");
        // Check RLS status of tables
        const tablesRes = await pool.query(`
            SELECT 
                schemaname, 
                tablename, 
                rowsecurity,
                (SELECT count(*) FROM pg_policies p WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename) as policy_count
            FROM pg_tables t
            WHERE schemaname = 'public'
        `);
        
        tablesRes.rows.forEach(t => {
            console.log(`[Table] ${t.schemaname}.${t.tablename} - RLS: ${t.rowsecurity ? 'ENABLED' : 'DISABLED'} (Policies: ${t.policy_count})`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSecurity();
