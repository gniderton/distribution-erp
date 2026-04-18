const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function auditInvoice() {
    try {
        console.log("--- HEADER ---");
        const header = await pool.query("SELECT * FROM sales_invoices WHERE id = 1054");
        console.log(JSON.stringify(header.rows, null, 2));

        console.log("\n--- LINES ---");
        const lines = await pool.query("SELECT * FROM sales_invoice_lines WHERE invoice_id = 1054");
        console.log(JSON.stringify(lines.rows, null, 2));

        console.log("\n--- BATCHES USED ---");
        const batchIds = lines.rows.map(l => l.batch_id).filter(id => id);
        if (batchIds.length > 0) {
            const batches = await pool.query("SELECT id, product_id, purchase_rate, net_purchase_rate FROM inventory_batches WHERE id = ANY($1)", [batchIds]);
            console.log(JSON.stringify(batches.rows, null, 2));
        }

        console.log("\n--- JOURNAL ENTRIES ---");
        const journalEntries = await pool.query("SELECT id, transaction_date, description, reference_type, reference_id FROM journal_entries WHERE reference_id = 1054 AND reference_type IN ('SALES_INV', 'COGS')");
        const entryIds = journalEntries.rows.map(h => h.id);
        console.log("Found Entry IDs:", entryIds);
        
        if (entryIds.length > 0) {
            const journalLines = await pool.query(`
                SELECT jl.*, coa.name as account_name, coa.code as account_code 
                FROM journal_lines jl
                JOIN chart_of_accounts coa ON jl.account_id = coa.id
                WHERE jl.journal_entry_id = ANY($1::bigint[])
            `, [entryIds]);
            
            console.log(`Found ${journalLines.rows.length} lines across all entries.`);

            journalEntries.rows.forEach(h => {
                console.log(`\nEntry: ${h.description} (ID: ${h.id}, Type: ${h.reference_type})`);
                const hl = journalLines.rows.filter(l => l.journal_entry_id == h.id);
                console.log(JSON.stringify(hl, null, 2));
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

auditInvoice();
