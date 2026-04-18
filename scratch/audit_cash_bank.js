require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function audit() {
    try {
        const query = `
            SELECT 
                je.reference_type, 
                COALESCE(SUM(jl.debit), 0) as inflow, 
                COALESCE(SUM(jl.credit), 0) as outflow,
                COUNT(*) as transaction_count
            FROM journal_lines jl 
            JOIN journal_entries je ON jl.journal_entry_id = je.id 
            JOIN chart_of_accounts coa ON jl.account_id = coa.id 
            WHERE coa.code = $1
            GROUP BY je.reference_type
            ORDER BY inflow DESC
        `;

        const cashRes = await pool.query(query, [1003]);
        console.log('--- CASH ACCOUNT (1003) BREAKDOWN ---');
        console.table(cashRes.rows);

        const bankRes = await pool.query(query, [1002]);
        console.log('\n--- BANK ACCOUNT (1002) BREAKDOWN ---');
        console.table(bankRes.rows);

    } catch (e) {
        console.error("Audit failed:", e.message);
    } finally {
        await pool.end();
    }
}

audit();
