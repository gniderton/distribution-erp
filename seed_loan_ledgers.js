const { pool } = require('./config/db');

async function upgrade() {
    try {
        console.log("Seeding missing Chart of Accounts...");
        await pool.query(`
            INSERT INTO chart_of_accounts (code, name, type) VALUES
            (1105, 'Loans Receivable', 'ASSET'),
            (2101, 'Loans Payable', 'LIABILITY'),
            (4101, 'Interest Income', 'INCOME'),
            (5101, 'Interest Expense', 'EXPENSE')
            ON CONFLICT (code) DO NOTHING;
        `);
        console.log("✅ Seeded successfully.");
        process.exit(0);
    } catch(err) {
        console.error("❌ Failed:", err);
        process.exit(1);
    }
}
upgrade();
