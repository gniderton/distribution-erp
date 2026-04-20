const { pool } = require('./config/db');

async function auditLiquidity() {
    try {
        console.log("🕵️ Auditing Bank & Cash Balances...\n");

        const accounts = [
            { code: 1002, name: "Bank Account" },
            { code: 1003, name: "Cash in Hand" }
        ];

        for (const acc of accounts) {
            console.log(`=== Audit for ${acc.name} (${acc.code}) ===`);

            // 1. Get Account ID
            const accRes = await pool.query("SELECT id FROM chart_of_accounts WHERE code = $1", [acc.code]);
            const accId = accRes.rows[0].id;

            // 2. Summary by Reference Type
            const summaryRes = await pool.query(`
                SELECT 
                    COALESCE(je.reference_type, 'MANUAL') as type,
                    SUM(jl.debit) as total_debit,
                    SUM(jl.credit) as total_credit,
                    COUNT(*) as entry_count
                FROM journal_lines jl
                JOIN journal_entries je ON jl.journal_entry_id = je.id
                WHERE jl.account_id = $1
                GROUP BY 1
                ORDER BY 2 DESC
            `, [accId]);

            console.table(summaryRes.rows.map(r => ({
                Type: r.type,
                "Total In (Debit)": parseFloat(r.total_debit).toLocaleString(),
                "Total Out (Credit)": parseFloat(r.total_credit).toLocaleString(),
                "Net": (parseFloat(r.total_debit) - parseFloat(r.total_credit)).toLocaleString(),
                Count: r.entry_count
            })));

            const total = await pool.query("SELECT SUM(debit - credit) as balance FROM journal_lines WHERE account_id = $1", [accId]);
            console.log(`\n💰 FINAL LEDGER BALANCE: ₹${parseFloat(total.rows[0].balance).toLocaleString()}\n`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

auditLiquidity();
